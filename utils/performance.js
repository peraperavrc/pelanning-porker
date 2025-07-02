const logger = require('./logger');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            socketConnections: 0,
            activeConnections: 0,
            totalVotes: 0,
            totalGames: 0,
            averageResponseTime: 0,
            errorCount: 0
        };
        
        this.responseTimers = new Map();
        this.memoryUsage = [];
        this.startTime = Date.now();
        
        // Start monitoring
        this.startMemoryMonitoring();
    }
    
    // Timer utilities
    startTimer(id) {
        this.responseTimers.set(id, process.hrtime.bigint());
    }
    
    endTimer(id, operation) {
        const startTime = this.responseTimers.get(id);
        if (startTime) {
            const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to ms
            this.responseTimers.delete(id);
            
            // Update average response time
            this.updateAverageResponseTime(duration);
            
            // Log slow operations
            if (duration > 100) { // More than 100ms
                logger.performance(operation, duration, { slow: true });
            }
            
            return duration;
        }
        return 0;
    }
    
    updateAverageResponseTime(newTime) {
        if (this.metrics.averageResponseTime === 0) {
            this.metrics.averageResponseTime = newTime;
        } else {
            // Simple moving average
            this.metrics.averageResponseTime = (this.metrics.averageResponseTime * 0.9) + (newTime * 0.1);
        }
    }
    
    // Memory monitoring
    startMemoryMonitoring() {
        setInterval(() => {
            const usage = process.memoryUsage();
            this.memoryUsage.push({
                timestamp: Date.now(),
                heapUsed: usage.heapUsed,
                heapTotal: usage.heapTotal,
                external: usage.external,
                rss: usage.rss
            });
            
            // Keep only last 100 entries
            if (this.memoryUsage.length > 100) {
                this.memoryUsage.shift();
            }
            
            // Log memory warnings
            const heapUsedMB = usage.heapUsed / 1024 / 1024;\n            if (heapUsedMB > 500) { // More than 500MB\n                logger.warn('High memory usage detected', {\n                    heapUsedMB: Math.round(heapUsedMB),\n                    heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024)\n                });\n            }\n        }, 30000); // Every 30 seconds\n    }\n    \n    // Metrics tracking\n    incrementSocketConnection() {\n        this.metrics.socketConnections++;\n        this.metrics.activeConnections++;\n    }\n    \n    decrementActiveConnection() {\n        this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);\n    }\n    \n    incrementVote() {\n        this.metrics.totalVotes++;\n    }\n    \n    incrementGame() {\n        this.metrics.totalGames++;\n    }\n    \n    incrementError() {\n        this.metrics.errorCount++;\n    }\n    \n    // Resource cleanup utilities\n    cleanupResources() {\n        // Clear old response timers\n        const now = process.hrtime.bigint();\n        const timeout = 300000000000n; // 5 minutes in nanoseconds\n        \n        for (const [id, startTime] of this.responseTimers.entries()) {\n            if (now - startTime > timeout) {\n                this.responseTimers.delete(id);\n                logger.warn('Cleaned up stale response timer', { id });\n            }\n        }\n    }\n    \n    // Rate limiting helper\n    createRateLimiter(windowMs = 60000, maxRequests = 100) {\n        const requests = new Map();\n        \n        return (identifier) => {\n            const now = Date.now();\n            const userRequests = requests.get(identifier) || [];\n            \n            // Remove old requests outside the window\n            const validRequests = userRequests.filter(time => now - time < windowMs);\n            \n            if (validRequests.length >= maxRequests) {\n                return false; // Rate limited\n            }\n            \n            validRequests.push(now);\n            requests.set(identifier, validRequests);\n            \n            return true; // Allow request\n        };\n    }\n    \n    // Throttling helper for high-frequency events\n    createThrottler(delay = 1000) {\n        const timers = new Map();\n        \n        return (id, callback) => {\n            if (timers.has(id)) {\n                return false; // Throttled\n            }\n            \n            timers.set(id, setTimeout(() => {\n                timers.delete(id);\n                callback();\n            }, delay));\n            \n            return true; // Executed\n        };\n    }\n    \n    // Debouncing helper for position updates\n    createDebouncer(delay = 100) {\n        const timers = new Map();\n        \n        return (id, callback) => {\n            const existingTimer = timers.get(id);\n            if (existingTimer) {\n                clearTimeout(existingTimer);\n            }\n            \n            const timer = setTimeout(() => {\n                timers.delete(id);\n                callback();\n            }, delay);\n            \n            timers.set(id, timer);\n        };\n    }\n    \n    // Health check\n    getHealthStatus() {\n        const uptime = Date.now() - this.startTime;\n        const memUsage = process.memoryUsage();\n        \n        return {\n            status: 'healthy',\n            uptime,\n            metrics: this.metrics,\n            memory: {\n                heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),\n                heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),\n                rssMB: Math.round(memUsage.rss / 1024 / 1024)\n            },\n            timestamp: new Date().toISOString()\n        };\n    }\n    \n    // Performance report\n    generateReport() {\n        const report = {\n            ...this.getHealthStatus(),\n            averageResponseTimeMs: Math.round(this.metrics.averageResponseTime * 100) / 100,\n            errorRate: this.metrics.socketConnections > 0 \n                ? (this.metrics.errorCount / this.metrics.socketConnections * 100).toFixed(2) + '%'\n                : '0%',\n            votesPerGame: this.metrics.totalGames > 0 \n                ? Math.round(this.metrics.totalVotes / this.metrics.totalGames)\n                : 0\n        };\n        \n        logger.info('Performance Report Generated', report);\n        return report;\n    }\n    \n    // Cleanup on shutdown\n    cleanup() {\n        // Clear all timers\n        for (const timer of this.responseTimers.values()) {\n            // Response timers are using hrtime, no need to clear\n        }\n        this.responseTimers.clear();\n        \n        logger.info('Performance monitor cleaned up');\n    }\n}\n\n// Singleton instance\nconst performanceMonitor = new PerformanceMonitor();\n\n// Auto-cleanup every 5 minutes\nsetInterval(() => {\n    performanceMonitor.cleanupResources();\n}, 300000);\n\nmodule.exports = performanceMonitor;