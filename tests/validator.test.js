const Validator = require('../utils/validator');

describe('Validator', () => {
    describe('validatePlayerName', () => {
        test('should accept valid player names', () => {
            const result = Validator.validatePlayerName('TestPlayer');
            expect(result.isValid).toBe(true);
            expect(result.sanitized).toBe('TestPlayer');
            expect(result.errors).toHaveLength(0);
        });

        test('should reject empty names', () => {
            const result = Validator.validatePlayerName('');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Player name cannot be empty after sanitization');
        });

        test('should reject too long names', () => {
            const longName = 'a'.repeat(25);
            const result = Validator.validatePlayerName(longName);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Player name must be 20 characters or less');
        });

        test('should reject inappropriate names', () => {
            const result = Validator.validatePlayerName('admin');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Player name contains inappropriate content');
        });

        test('should sanitize HTML tags', () => {
            const result = Validator.validatePlayerName('Test<script>Player');
            expect(result.sanitized).toBe('TestscriptPlayer');
        });

        test('should reject non-string input', () => {
            const result = Validator.validatePlayerName(123);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Player name is required');
        });
    });

    describe('validatePlayerId', () => {
        test('should accept valid player IDs', () => {
            const result = Validator.validatePlayerId('player_abc123def');
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject invalid format', () => {
            const result = Validator.validatePlayerId('invalid_id');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid player ID format');
        });

        test('should reject empty ID', () => {
            const result = Validator.validatePlayerId('');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Player ID is required');
        });
    });

    describe('validateVote', () => {
        test('should accept valid votes', () => {
            const validVotes = ['1', '2', '3', '5', '8', '13', '21', '?'];
            validVotes.forEach(vote => {
                const result = Validator.validateVote(vote);
                expect(result.isValid).toBe(true);
            });
        });

        test('should reject invalid votes', () => {
            const result = Validator.validateVote('invalid');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Invalid vote value. Must be one of: 1, 2, 3, 5, 8, 13, 21, ?');
        });

        test('should reject empty vote', () => {
            const result = Validator.validateVote('');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Vote is required');
        });
    });

    describe('validatePosition', () => {
        test('should accept valid positions', () => {
            const result = Validator.validatePosition({ x: 1.5, y: 2.0, z: -3.5 });
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject non-object positions', () => {
            const result = Validator.validatePosition('invalid');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Position is required');
        });

        test('should reject non-numeric coordinates', () => {
            const result = Validator.validatePosition({ x: 'invalid', y: 2, z: 3 });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Position coordinates must be numbers');
        });

        test('should reject out-of-bounds positions', () => {
            const result = Validator.validatePosition({ x: 150, y: 2, z: 3 });
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Position coordinates are out of bounds');
        });
    });

    describe('validateStory', () => {
        test('should accept valid stories', () => {
            const result = Validator.validateStory('User login functionality');
            expect(result.isValid).toBe(true);
            expect(result.sanitized).toBe('User login functionality');
        });

        test('should reject empty stories', () => {
            const result = Validator.validateStory('');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Story cannot be empty after sanitization');
        });

        test('should reject too long stories', () => {
            const longStory = 'a'.repeat(600);
            const result = Validator.validateStory(longStory);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Story must be 500 characters or less');
        });

        test('should sanitize story content', () => {
            const result = Validator.validateStory('Story with <script> tag');
            expect(result.sanitized).toBe('Story with script tag');
        });
    });

    describe('validateSocketData', () => {
        test('should accept valid data with required fields', () => {
            const data = { playerId: 'player_123456789', playerName: 'Test' };
            const result = Validator.validateSocketData(data, ['playerId', 'playerName']);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject missing required fields', () => {
            const data = { playerId: 'player_123456789' };
            const result = Validator.validateSocketData(data, ['playerId', 'playerName']);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Missing required field: playerName');
        });

        test('should reject non-object data', () => {
            const result = Validator.validateSocketData('invalid', []);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Data is required');
        });
    });
});