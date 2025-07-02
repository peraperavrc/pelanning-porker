const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class Logger {
    constructor() {
        this.logLevel = config.logging.level;
        this.enableConsole = config.logging.enableConsole;
        this.enableFile = config.logging.enableFile;
        this.logPath = config.logging.logPath;
        
        // Create log directory if it doesn't exist
        if (this.enableFile && !fs.existsSync(this.logPath)) {
            fs.mkdirSync(this.logPath, { recursive: true });
        }
        
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }
    
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
    }
    
    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }
    
    writeToFile(level, formattedMessage) {
        if (!this.enableFile) return;
        
        const filename = `${level}-${new Date().toISOString().split('T')[0]}.log`;
        const filepath = path.join(this.logPath, filename);
        
        fs.appendFileSync(filepath, formattedMessage + '\n');
    }
    
    log(level, message, meta = {}) {
        if (!this.shouldLog(level)) return;
        
        const formattedMessage = this.formatMessage(level, message, meta);
        
        // Console output
        if (this.enableConsole) {
            switch (level) {
                case 'error':
                    console.error(formattedMessage);
                    break;
                case 'warn':
                    console.warn(formattedMessage);
                    break;
                case 'info':
                    console.info(formattedMessage);
                    break;
                case 'debug':
                    console.debug(formattedMessage);
                    break;
                default:
                    console.log(formattedMessage);
            }
        }
        
        // File output
        this.writeToFile(level, formattedMessage);
    }
    
    error(message, meta = {}) {
        this.log('error', message, meta);
    }
    
    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }
    
    info(message, meta = {}) {
        this.log('info', message, meta);
    }
    
    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }
    
    // Game-specific logging methods
    gameEvent(event, data = {}) {
        this.info(`Game Event: ${event}`, data);
    }
    
    playerAction(playerId, action, data = {}) {
        this.info(`Player Action: ${action}`, { playerId, ...data });
    }
    
    serverEvent(event, data = {}) {
        this.info(`Server Event: ${event}`, data);
    }
    
    performance(operation, duration, data = {}) {
        this.debug(`Performance: ${operation} took ${duration}ms`, data);
    }
}

// Singleton instance
const logger = new Logger();

module.exports = logger;