const logger = require('./logger');

class ErrorHandler {
    static handleSocketError(socket, error, context = '') {
        const errorId = this.generateErrorId();
        const errorInfo = {
            errorId,
            socketId: socket.id,
            context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        logger.error(`Socket Error [${errorId}]: ${error.message}`, errorInfo);
        
        // Send user-friendly error to client
        socket.emit('error', {
            errorId,
            message: this.getUserFriendlyMessage(error),
            timestamp: errorInfo.timestamp
        });
    }
    
    static handleGameError(gameRoom, error, context = '') {
        const errorId = this.generateErrorId();
        const errorInfo = {
            errorId,
            context,
            gameState: gameRoom?.gameState,
            playerCount: gameRoom?.players?.size,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        logger.error(`Game Error [${errorId}]: ${error.message}`, errorInfo);
        
        return errorId;
    }
    
    static handleValidationError(validationResult, context = '') {
        const errorId = this.generateErrorId();
        const errorInfo = {
            errorId,
            context,
            errors: validationResult.errors,
            timestamp: new Date().toISOString()
        };
        
        logger.warn(`Validation Error [${errorId}]: ${validationResult.errors.join(', ')}`, errorInfo);
        
        return {
            errorId,
            message: 'Validation failed',
            details: validationResult.errors
        };
    }
    
    static handleCriticalError(error, context = '') {
        const errorId = this.generateErrorId();
        const errorInfo = {
            errorId,
            context,
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        logger.error(`Critical Error [${errorId}]: ${error.message}`, errorInfo);
        
        // For critical errors, we might want to notify monitoring systems
        if (process.env.NODE_ENV === 'production') {
            this.notifyMonitoring(errorInfo);
        }
        
        return errorId;
    }
    
    static generateErrorId() {
        return 'ERR_' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
    
    static getUserFriendlyMessage(error) {
        // Map technical errors to user-friendly messages
        const errorMap = {
            'ECONNREFUSED': 'ネットワーク接続に問題があります。しばらく待ってから再試行してください。',
            'ENOTFOUND': 'サーバーに接続できません。インターネット接続を確認してください。',
            'TIMEOUT': 'リクエストがタイムアウトしました。再試行してください。',
            'ValidationError': '入力データに問題があります。入力内容を確認してください。',
            'UnauthorizedError': 'このアクションを実行する権限がありません。',
            'GameStateError': 'ゲームの状態が無効です。ページを再読み込みしてください。'
        };
        
        // Check if error message contains known patterns
        for (const [key, message] of Object.entries(errorMap)) {
            if (error.message.includes(key)) {
                return message;
            }
        }
        
        // Default message for unknown errors
        return '予期しないエラーが発生しました。ページを再読み込みしてください。';
    }
    
    static notifyMonitoring(errorInfo) {
        // Placeholder for monitoring system integration
        // In production, this could send to services like Sentry, DataDog, etc.
        console.error('[MONITORING] Critical Error:', errorInfo);
    }
    
    static createExpressErrorHandler() {
        return (error, req, res, next) => {
            const errorId = this.handleCriticalError(error, `Express Route: ${req.path}`);
            
            res.status(500).json({
                error: true,
                errorId,
                message: this.getUserFriendlyMessage(error),
                timestamp: new Date().toISOString()
            });
        };
    }
    
    static createProcessErrorHandlers() {
        process.on('uncaughtException', (error) => {
            const errorId = this.handleCriticalError(error, 'Uncaught Exception');
            console.error(`[${errorId}] Uncaught Exception:`, error);
            
            // Graceful shutdown
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            const errorId = this.handleCriticalError(error, 'Unhandled Rejection');
            console.error(`[${errorId}] Unhandled Rejection at:`, promise, 'reason:', reason);
        });
        
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            process.exit(0);
        });
        
        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            process.exit(0);
        });
    }
}

module.exports = ErrorHandler;