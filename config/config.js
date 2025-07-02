// Configuration management for MetaPoker
const config = {
    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0',
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST", "PUT", "DELETE"]
        }
    },
    
    // Game configuration
    game: {
        maxPlayers: parseInt(process.env.MAX_PLAYERS) || 8,
        timerDuration: parseInt(process.env.TIMER_DURATION) || 300, // 5 minutes
        autoReveal: process.env.AUTO_REVEAL === 'true',
        cardValues: ['1', '2', '3', '5', '8', '13', '21', '?'],
        defaultStory: process.env.DEFAULT_STORY || 'デフォルトストーリー: 機能実装の見積もり'
    },
    
    // Security configuration
    security: {
        maxNameLength: parseInt(process.env.MAX_NAME_LENGTH) || 20,
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100
        },
        sanitizeInput: process.env.SANITIZE_INPUT !== 'false'
    },
    
    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: process.env.ENABLE_CONSOLE_LOG !== 'false',
        enableFile: process.env.ENABLE_FILE_LOG === 'true',
        logPath: process.env.LOG_PATH || './logs'
    },
    
    // Development configuration
    development: {
        enableDebug: process.env.NODE_ENV === 'development',
        enableHotReload: process.env.ENABLE_HOT_RELOAD === 'true',
        mockData: process.env.USE_MOCK_DATA === 'true'
    }
};

// Validation
const validateConfig = () => {
    const errors = [];
    
    if (config.server.port < 1 || config.server.port > 65535) {
        errors.push('Invalid port number');
    }
    
    if (config.game.maxPlayers < 2 || config.game.maxPlayers > 20) {
        errors.push('Invalid max players count');
    }
    
    if (config.game.timerDuration < 30 || config.game.timerDuration > 3600) {
        errors.push('Invalid timer duration');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
};

// Initialize configuration
try {
    validateConfig();
    console.log('Configuration loaded successfully');
} catch (error) {
    console.error('Configuration error:', error.message);
    process.exit(1);
}

module.exports = config;