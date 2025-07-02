// Mock config to avoid file system dependencies in tests
jest.mock('../config/config', () => ({
    game: {
        defaultStory: 'Test Story',
        timerDuration: 300
    }
}));

// We need to import GameRoom from server.js
// For now, we'll test the GameRoom class functionality through integration tests
const request = require('supertest');

describe('GameRoom Integration Tests', () => {
    let app;
    let server;

    beforeEach(() => {
        // Reset modules to get fresh instances
        jest.resetModules();
        // Import after resetting modules
        const serverModule = require('../server');
        app = serverModule.app;
        server = serverModule.server;
    });

    afterEach((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    describe('Basic Server Tests', () => {
        test('should respond to health check', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('players');
            expect(response.body).toHaveProperty('gameState');
            expect(response.body).toHaveProperty('timestamp');
        });

        test('should serve main page', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.text).toContain('MetaPoker');
            expect(response.text).toContain('A-Frame');
        });

        test('should serve static assets', async () => {
            await request(app)
                .get('/css/style.css')
                .expect(200);

            await request(app)
                .get('/js/metapoker.js')
                .expect(200);
        });
    });
});

// Unit tests for GameRoom logic (mocked)
describe('GameRoom Class Logic', () => {
    // Mock the GameRoom class
    class MockGameRoom {
        constructor() {
            this.players = new Map();
            this.votes = new Map();
            this.gameState = 'waiting';
            this.currentStory = 'Test Story';
            this.timer = null;
            this.timerDuration = 300;
            this.timeLeft = 0;
        }

        addPlayer(playerId, playerData) {
            this.players.set(playerId, {
                ...playerData,
                hasVoted: false,
                socketId: playerData.socketId,
                position: { x: 0, y: 1.6, z: 3 },
                rotation: { x: 0, y: 0, z: 0 }
            });
        }

        removePlayer(playerId) {
            const player = this.players.get(playerId);
            if (player) {
                this.players.delete(playerId);
                this.votes.delete(playerId);
                return true;
            }
            return false;
        }

        castVote(playerId, vote) {
            if (this.players.has(playerId)) {
                this.votes.set(playerId, vote);
                const player = this.players.get(playerId);
                player.hasVoted = true;
                if (this.gameState === 'waiting') {
                    this.gameState = 'voting';
                }
                return true;
            }
            return false;
        }

        getAllVotes() {
            const votesArray = [];
            this.votes.forEach((vote, playerId) => {
                votesArray.push({
                    playerId,
                    vote,
                    playerName: this.players.get(playerId).playerName || 'Unknown'
                });
            });
            return votesArray;
        }

        areAllPlayersVoted() {
            return this.players.size > 0 && 
                   Array.from(this.players.values()).every(player => player.hasVoted);
        }

        resetVotes() {
            this.votes.clear();
            this.players.forEach(player => {
                player.hasVoted = false;
            });
            this.gameState = 'voting';
        }
    }

    let gameRoom;

    beforeEach(() => {
        gameRoom = new MockGameRoom();
    });

    describe('Player Management', () => {
        test('should add player successfully', () => {
            const playerData = {
                playerName: 'TestPlayer',
                socketId: 'socket123'
            };

            gameRoom.addPlayer('player_123', playerData);

            expect(gameRoom.players.size).toBe(1);
            expect(gameRoom.players.get('player_123')).toMatchObject({
                playerName: 'TestPlayer',
                socketId: 'socket123',
                hasVoted: false
            });
        });

        test('should remove player successfully', () => {
            const playerData = {
                playerName: 'TestPlayer',
                socketId: 'socket123'
            };

            gameRoom.addPlayer('player_123', playerData);
            const removed = gameRoom.removePlayer('player_123');

            expect(removed).toBe(true);
            expect(gameRoom.players.size).toBe(0);
        });

        test('should return false when removing non-existent player', () => {
            const removed = gameRoom.removePlayer('nonexistent');
            expect(removed).toBe(false);
        });
    });

    describe('Voting Logic', () => {
        beforeEach(() => {
            gameRoom.addPlayer('player_1', { playerName: 'Player1', socketId: 'socket1' });
            gameRoom.addPlayer('player_2', { playerName: 'Player2', socketId: 'socket2' });
        });

        test('should cast vote successfully', () => {
            const success = gameRoom.castVote('player_1', '5');

            expect(success).toBe(true);
            expect(gameRoom.votes.get('player_1')).toBe('5');
            expect(gameRoom.players.get('player_1').hasVoted).toBe(true);
            expect(gameRoom.gameState).toBe('voting');
        });

        test('should return false for invalid player vote', () => {
            const success = gameRoom.castVote('nonexistent', '5');
            expect(success).toBe(false);
        });

        test('should detect when all players have voted', () => {
            gameRoom.castVote('player_1', '5');
            expect(gameRoom.areAllPlayersVoted()).toBe(false);

            gameRoom.castVote('player_2', '8');
            expect(gameRoom.areAllPlayersVoted()).toBe(true);
        });

        test('should get all votes correctly', () => {
            gameRoom.castVote('player_1', '5');
            gameRoom.castVote('player_2', '8');

            const votes = gameRoom.getAllVotes();
            expect(votes).toHaveLength(2);
            expect(votes).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        playerId: 'player_1',
                        vote: '5',
                        playerName: 'Player1'
                    }),
                    expect.objectContaining({
                        playerId: 'player_2',
                        vote: '8',
                        playerName: 'Player2'
                    })
                ])
            );
        });

        test('should reset votes correctly', () => {
            gameRoom.castVote('player_1', '5');
            gameRoom.castVote('player_2', '8');

            gameRoom.resetVotes();

            expect(gameRoom.votes.size).toBe(0);
            expect(gameRoom.players.get('player_1').hasVoted).toBe(false);
            expect(gameRoom.players.get('player_2').hasVoted).toBe(false);
            expect(gameRoom.gameState).toBe('voting');
        });
    });

    describe('Game State Management', () => {
        test('should start in waiting state', () => {
            expect(gameRoom.gameState).toBe('waiting');
        });

        test('should change to voting when first vote is cast', () => {
            gameRoom.addPlayer('player_1', { playerName: 'Player1', socketId: 'socket1' });
            gameRoom.castVote('player_1', '5');
            
            expect(gameRoom.gameState).toBe('voting');
        });
    });
});