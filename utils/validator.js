const config = require('../config/config');

class Validator {
    static sanitizeString(input) {
        if (typeof input !== 'string') return '';
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/[&]/g, '&amp;')
            .replace(/['"]/g, '') // Remove quotes
            .substring(0, 1000); // Limit length
    }
    
    static validatePlayerName(name) {
        const errors = [];
        
        if (!name || typeof name !== 'string') {
            errors.push('Player name is required');
            return { isValid: false, errors, sanitized: '' };
        }
        
        const sanitized = this.sanitizeString(name);
        
        if (sanitized.length === 0) {
            errors.push('Player name cannot be empty after sanitization');
        }
        
        if (sanitized.length > config.security.maxNameLength) {
            errors.push(`Player name must be ${config.security.maxNameLength} characters or less`);
        }
        
        if (sanitized.length < 2) {
            errors.push('Player name must be at least 2 characters');
        }
        
        // Check for inappropriate content (basic)
        const inappropriate = ['admin', 'system', 'bot', 'null', 'undefined'];
        if (inappropriate.some(word => sanitized.toLowerCase().includes(word))) {
            errors.push('Player name contains inappropriate content');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized
        };
    }
    
    static validatePlayerId(playerId) {
        const errors = [];
        
        if (!playerId || typeof playerId !== 'string') {
            errors.push('Player ID is required');
            return { isValid: false, errors };
        }
        
        // Check format (should be player_XXXXXXXXX)
        const playerIdPattern = /^player_[a-zA-Z0-9]{9}$/;
        if (!playerIdPattern.test(playerId)) {
            errors.push('Invalid player ID format');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    static validateVote(vote) {
        const errors = [];
        
        if (!vote || typeof vote !== 'string') {
            errors.push('Vote is required');
            return { isValid: false, errors };
        }
        
        const validVotes = config.game.cardValues;
        if (!validVotes.includes(vote)) {
            errors.push(`Invalid vote value. Must be one of: ${validVotes.join(', ')}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    static validateStory(story) {
        const errors = [];
        
        if (!story || typeof story !== 'string') {
            errors.push('Story is required');
            return { isValid: false, errors, sanitized: '' };
        }
        
        const sanitized = this.sanitizeString(story);
        
        if (sanitized.length === 0) {
            errors.push('Story cannot be empty after sanitization');
        }
        
        if (sanitized.length > 500) {
            errors.push('Story must be 500 characters or less');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized
        };
    }
    
    static validatePosition(position) {
        const errors = [];
        
        if (!position || typeof position !== 'object') {
            errors.push('Position is required');
            return { isValid: false, errors };
        }
        
        const { x, y, z } = position;
        
        if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
            errors.push('Position coordinates must be numbers');
        }
        
        // Reasonable bounds check
        if (Math.abs(x) > 100 || Math.abs(y) > 100 || Math.abs(z) > 100) {
            errors.push('Position coordinates are out of bounds');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    static validateRotation(rotation) {
        const errors = [];
        
        if (!rotation || typeof rotation !== 'object') {
            errors.push('Rotation is required');
            return { isValid: false, errors };
        }
        
        const { x, y, z } = rotation;
        
        if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
            errors.push('Rotation coordinates must be numbers');
        }
        
        // Rotation should be in radians or degrees (-360 to 360)
        if (Math.abs(x) > 360 || Math.abs(y) > 360 || Math.abs(z) > 360) {
            errors.push('Rotation values are out of bounds');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    static validateSocketData(data, requiredFields = []) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Data is required');
            return { isValid: false, errors };
        }
        
        // Check required fields
        for (const field of requiredFields) {
            if (!(field in data)) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = Validator;