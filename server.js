const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const config = require('./config/config');
const logger = require('./utils/logger');
const Validator = require('./utils/validator');
const ErrorHandler = require('./utils/errorHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: config.server.cors
});

// Setup error handlers
ErrorHandler.createProcessErrorHandlers();
app.use(ErrorHandler.createExpressErrorHandler());

// Game state management
class GameRoom {
    constructor() {
        this.players = new Map();
        this.votes = new Map();
        this.gameState = 'waiting'; // waiting, voting, revealed
        this.currentStory = config.game.defaultStory;
        this.timer = null;
        this.timerDuration = config.game.timerDuration;
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
        logger.playerAction(playerId, 'joined', { playerName: playerData.playerName });
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.players.delete(playerId);
            this.votes.delete(playerId);
            logger.playerAction(playerId, 'left', { playerName: player.playerName });
        }
    }

    castVote(playerId, vote) {
        if (this.players.has(playerId)) {
            this.votes.set(playerId, vote);
            const player = this.players.get(playerId);
            player.hasVoted = true;
            // Start voting if not already started
            if (this.gameState === 'waiting') {
                this.gameState = 'voting';
            }
            console.log(`Vote cast: ${player.playerName} voted ${vote}`);
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
        console.log('Votes reset, new round started');
    }

    getPlayersArray() {
        return Array.from(this.players.values());
    }

    startTimer(duration = this.timerDuration) {
        this.timeLeft = duration;
        this.gameState = 'voting';
        
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            
            if (this.timeLeft <= 0) {
                this.revealVotes();
            }
        }, 1000);
        
        console.log(`Timer started: ${duration} seconds`);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    revealVotes() {
        this.gameState = 'revealed';
        this.stopTimer();
        console.log('Votes revealed');
    }

    setStory(story) {
        this.currentStory = story;
        console.log(`Story updated: ${story}`);
    }

    updatePlayerPosition(playerId, position, rotation) {
        if (this.players.has(playerId)) {
            const player = this.players.get(playerId);
            player.position = position;
            player.rotation = rotation;
            return true;
        }
        return false;
    }
}

// Global game room instance
const gameRoom = new GameRoom();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        players: gameRoom.players.size,
        gameState: gameRoom.gameState,
        timestamp: new Date().toISOString()
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Handle player joining room
    socket.on('join-room', (data) => {
        try {
            // Validate input data
            const dataValidation = Validator.validateSocketData(data, ['playerId', 'playerName']);
            if (!dataValidation.isValid) {
                ErrorHandler.handleSocketError(socket, new Error('Invalid join data'), 'join-room validation');
                return;
            }

            const { playerId, playerName } = data;
            
            // Validate player ID
            const playerIdValidation = Validator.validatePlayerId(playerId);
            if (!playerIdValidation.isValid) {
                ErrorHandler.handleSocketError(socket, new Error(playerIdValidation.errors.join(', ')), 'playerId validation');
                return;
            }
            
            // Validate and sanitize player name
            const nameValidation = Validator.validatePlayerName(playerName);
            if (!nameValidation.isValid) {
                ErrorHandler.handleSocketError(socket, new Error(nameValidation.errors.join(', ')), 'playerName validation');
                return;
            }
            
            // Check max players limit
            if (gameRoom.players.size >= config.game.maxPlayers) {
                ErrorHandler.handleSocketError(socket, new Error('Room is full'), 'max players exceeded');
                return;
            }
        
        // Add player to game room
        gameRoom.addPlayer(playerId, {
            playerName,
            socketId: socket.id,
            joinedAt: new Date()
        });

        // Join socket room
        socket.join('game-room');
        socket.playerId = playerId;

        // Notify all players about new player
        io.to('game-room').emit('player-joined', {
            playerId,
            playerName,
            players: gameRoom.getPlayersArray()
        });

        // Send current game state to new player
        socket.emit('game-state', {
            gameState: gameRoom.gameState,
            story: gameRoom.currentStory,
            timeLeft: gameRoom.timeLeft,
            players: gameRoom.getPlayersArray()
        });

            logger.gameEvent('player-joined', { playerId, playerName: nameValidation.sanitized, socketId: socket.id });
        } catch (error) {
            ErrorHandler.handleSocketError(socket, error, 'join-room');
        }
    });

    // Handle vote casting
    socket.on('cast-vote', (data) => {
        try {
            // Validate input data
            const dataValidation = Validator.validateSocketData(data, ['playerId', 'vote']);
            if (!dataValidation.isValid) {
                ErrorHandler.handleSocketError(socket, new Error('Invalid vote data'), 'cast-vote validation');
                return;
            }

            const { playerId, vote } = data;
            
            // Validate player ID
            const playerIdValidation = Validator.validatePlayerId(playerId);
            if (!playerIdValidation.isValid) {
                ErrorHandler.handleSocketError(socket, new Error(playerIdValidation.errors.join(', ')), 'cast-vote playerId');
                return;
            }
            
            // Validate vote
            const voteValidation = Validator.validateVote(vote);
            if (!voteValidation.isValid) {
                ErrorHandler.handleSocketError(socket, new Error(voteValidation.errors.join(', ')), 'cast-vote vote');
                return;
            }
        
        // Allow voting in waiting state to start the game
        if (gameRoom.gameState !== 'voting' && gameRoom.gameState !== 'waiting') {
            socket.emit('error', { message: '投票期間ではありません' });
            return;
        }

        const success = gameRoom.castVote(playerId, vote);
        
        if (success) {
            // Notify all players about the vote and game state change
            io.to('game-room').emit('vote-cast', {
                playerId,
                players: gameRoom.getPlayersArray(),
                gameState: gameRoom.gameState
            });

            // Check if all players have voted
            if (gameRoom.areAllPlayersVoted()) {
                gameRoom.revealVotes();
                const allVotes = gameRoom.getAllVotes();
                
                io.to('game-room').emit('votes-revealed', {
                    votes: allVotes,
                    summary: calculateVoteSummary(allVotes)
                });
            }
            } else {
                ErrorHandler.handleSocketError(socket, new Error('Failed to cast vote'), 'cast-vote failed');
            }
        } catch (error) {
            ErrorHandler.handleSocketError(socket, error, 'cast-vote');
        }
    });

    // Handle game reset
    socket.on('reset-game', () => {
        gameRoom.resetVotes();
        io.to('game-room').emit('game-reset', {
            gameState: gameRoom.gameState,
            players: gameRoom.getPlayersArray()
        });
    });

    // Handle story update
    socket.on('update-story', (data) => {
        const { story } = data;
        gameRoom.setStory(story);
        io.to('game-room').emit('story-updated', { story });
    });

    // Handle timer start
    socket.on('start-timer', (data) => {
        const { duration } = data;
        gameRoom.startTimer(duration);
        io.to('game-room').emit('timer-started', { 
            duration: gameRoom.timerDuration,
            timeLeft: gameRoom.timeLeft 
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.playerId) {
            const player = gameRoom.players.get(socket.playerId);
            gameRoom.removePlayer(socket.playerId);

            if (player) {
                io.to('game-room').emit('player-left', {
                    playerId: socket.playerId,
                    playerName: player.playerName,
                    players: gameRoom.getPlayersArray()
                });
            }
        }
        
        console.log(`Client disconnected: ${socket.id}`);
    });

    // Handle player position updates
    socket.on('player-move', (data) => {
        const { playerId, position, rotation } = data;
        
        const success = gameRoom.updatePlayerPosition(playerId, position, rotation);
        
        if (success) {
            // Broadcast position update to all other players
            socket.broadcast.to('game-room').emit('player-moved', {
                playerId,
                position,
                rotation
            });
        }
    });

    // Handle custom events for admin functions
    socket.on('admin-reveal-votes', () => {
        if (gameRoom.votes.size > 0) {
            gameRoom.revealVotes();
            const allVotes = gameRoom.getAllVotes();
            
            io.to('game-room').emit('votes-revealed', {
                votes: allVotes,
                summary: calculateVoteSummary(allVotes)
            });
        }
    });
});

// Timer broadcast (sends timer updates to all clients)
setInterval(() => {
    if (gameRoom.timer && gameRoom.timeLeft > 0) {
        io.to('game-room').emit('timer-update', { 
            timeLeft: gameRoom.timeLeft 
        });
    }
}, 1000);

// Utility functions
function calculateVoteSummary(votes) {
    const voteCounts = {};
    const voteValues = [];
    
    votes.forEach(vote => {
        const value = vote.vote;
        voteCounts[value] = (voteCounts[value] || 0) + 1;
        
        // Convert vote to number for average calculation (skip '?' votes)
        if (value !== '?' && !isNaN(value)) {
            voteValues.push(parseInt(value));
        }
    });
    
    const average = voteValues.length > 0 
        ? voteValues.reduce((a, b) => a + b, 0) / voteValues.length 
        : 0;
    
    const mostCommon = Object.keys(voteCounts).reduce((a, b) => 
        voteCounts[a] > voteCounts[b] ? a : b
    );
    
    return {
        voteCounts,
        average: Math.round(average * 10) / 10,
        mostCommon,
        totalVotes: votes.length
    };
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 3000;
// Start server
server.listen(PORT, () => {
    console.log(`MetaPoker server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to start playing`);
});

module.exports = { app, server, io };