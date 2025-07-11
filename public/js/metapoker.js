// MetaPoker Client-side JavaScript
class MetaPoker {
    constructor() {
        this.socket = null;
        this.playerName = '';
        this.playerId = '';
        this.currentVote = null;
        this.gameState = 'waiting'; // waiting, voting, revealed
        this.players = new Map();
        this.timer = null;
        this.timerInterval = null;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // A-Frame scene ready
        const scene = document.querySelector('a-scene');
        if (scene.hasLoaded) {
            this.setupAFrameEvents();
        } else {
            scene.addEventListener('loaded', () => this.setupAFrameEvents());
        }

        // Enter key for name input
        const nameInput = document.getElementById('playerName');
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.joinRoom();
                }
            });
        }
    }

    setupAFrameEvents() {
        // Setup card click events
        const cards = document.querySelectorAll('.poker-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                this.selectCard(card.getAttribute('data-value'));
            });
            
            // Hover effects
            card.addEventListener('mouseenter', (e) => {
                if (this.gameState === 'voting' || this.gameState === 'waiting') {
                    card.setAttribute('material', 'color: #ffeb3b; opacity: 0.9');
                }
            });
            
            card.addEventListener('mouseleave', (e) => {
                if ((this.gameState === 'voting' || this.gameState === 'waiting') && this.currentVote !== card.getAttribute('data-value')) {
                    card.setAttribute('material', 'color: #ffffff; opacity: 0.9');
                }
            });
        });

        // Setup admin button events
        const adminButtons = document.querySelectorAll('.admin-button');
        adminButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.getAttribute('data-action');
                this.handleAdminAction(action);
            });
            
            // Hover effects for admin buttons
            button.addEventListener('mouseenter', (e) => {
                const currentColor = button.getAttribute('material').color;
                button.setAttribute('material', `color: ${currentColor}; opacity: 0.8`);
            });
            
            button.addEventListener('mouseleave', (e) => {
                const currentColor = button.getAttribute('material').color;
                button.setAttribute('material', `color: ${currentColor}; opacity: 1`);
            });
        });
    }

    joinRoom() {
        const nameInput = document.getElementById('playerName');
        const playerName = nameInput.value.trim();
        
        if (!playerName) {
            alert('ニックネームを入力してください');
            return;
        }
        
        this.playerName = playerName;
        this.playerId = this.generatePlayerId();
        
        // Hide login modal
        document.getElementById('loginModal').classList.add('hidden');
        
        // Initialize socket connection
        this.initSocket();
        
        // Create player UI
        this.createPlayerUI();
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substring(2, 11);
    }

    initSocket() {
        // Connect to WebSocket server
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateStatus('接続済み', 'connected');
            
            // Join room with player info
            this.socket.emit('join-room', {
                playerId: this.playerId,
                playerName: this.playerName
            });
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateStatus('切断', 'disconnected');
        });

        this.socket.on('player-joined', (data) => {
            this.handlePlayerJoined(data);
        });

        this.socket.on('game-state', (data) => {
            this.gameState = data.gameState || 'waiting';
            if (data.story) {
                this.updateStory(data.story);
            }
            if (data.players && Array.isArray(data.players)) {
                this.players.clear();
                data.players.forEach(player => {
                    this.players.set(player.playerId || player.socketId, player);
                });
                this.updatePlayerList();
            }
            if (data.timeLeft) {
                this.updateTimer(data.timeLeft);
            }
        });

        this.socket.on('player-left', (data) => {
            this.handlePlayerLeft(data);
        });

        this.socket.on('vote-cast', (data) => {
            this.handleVoteCast(data);
        });

        this.socket.on('votes-revealed', (data) => {
            this.handleVotesRevealed(data);
        });

        this.socket.on('game-reset', (data) => {
            this.handleGameReset(data);
        });

        this.socket.on('story-updated', (data) => {
            this.updateStory(data.story);
        });

        this.socket.on('timer-update', (data) => {
            this.updateTimer(data.timeLeft);
        });

        this.socket.on('player-moved', (data) => {
            this.updatePlayerPosition(data.playerId, data.position, data.rotation);
        });
    }

    selectCard(value) {
        if (this.gameState !== 'voting' && this.gameState !== 'waiting') {
            // Allow voting in waiting state to start the game
            this.gameState = 'voting';
        }

        // Update visual selection
        this.updateCardSelection(value);
        
        // Send vote to server
        this.socket.emit('cast-vote', {
            playerId: this.playerId,
            vote: value
        });
        
        this.currentVote = value;
        console.log(`Vote cast: ${value}`);
    }

    updateCardSelection(selectedValue) {
        const cards = document.querySelectorAll('.poker-card');
        cards.forEach(card => {
            const cardValue = card.getAttribute('data-value');
            if (cardValue === selectedValue) {
                card.setAttribute('material', 'color: #4CAF50; opacity: 1');
            } else {
                card.setAttribute('material', 'color: #ffffff; opacity: 0.5');
            }
        });
    }

    handlePlayerJoined(data) {
        // Update players array properly
        if (data.players && Array.isArray(data.players)) {
            this.players.clear();
            data.players.forEach(player => {
                this.players.set(player.playerId || player.socketId, player);
            });
        } else {
            this.players.set(data.playerId, data);
        }
        this.updatePlayerList();
        this.createPlayerAvatar(data);
        console.log(`Player joined: ${data.playerName}`);
    }

    handlePlayerLeft(data) {
        this.players.delete(data.playerId);
        this.updatePlayerList();
        this.removePlayerAvatar(data.playerId);
        console.log(`Player left: ${data.playerName}`);
    }

    handleVoteCast(data) {
        if (this.players.has(data.playerId)) {
            const player = this.players.get(data.playerId);
            player.hasVoted = true;
            this.updatePlayerList();
        }
    }

    handleVotesRevealed(data) {
        this.gameState = 'revealed';
        this.displayVoteResults(data.votes);
        this.resetCardSelection();
    }

    handleGameReset(data) {
        this.gameState = 'voting';
        this.currentVote = null;
        this.resetCardSelection();
        this.hideVoteResults();
        
        // Reset player vote status
        this.players.forEach(player => {
            player.hasVoted = false;
        });
        this.updatePlayerList();
    }

    displayVoteResults(votes) {
        const resultsContainer = document.getElementById('voteResults');
        const resultsText = document.getElementById('resultsText');
        
        let resultString = '投票結果:\n';
        votes.forEach(vote => {
            const player = this.players.get(vote.playerId);
            if (player) {
                resultString += `${player.playerName}: ${vote.vote}\n`;
            }
        });
        
        resultsText.setAttribute('value', resultString);
        resultsContainer.setAttribute('visible', 'true');
    }

    hideVoteResults() {
        const resultsContainer = document.getElementById('voteResults');
        resultsContainer.setAttribute('visible', 'false');
    }

    resetCardSelection() {
        const cards = document.querySelectorAll('.poker-card');
        cards.forEach(card => {
            card.setAttribute('material', 'color: #ffffff; opacity: 0.9');
        });
    }

    createPlayerAvatar(playerData) {
        const avatarContainer = document.getElementById('avatarContainer');
        const playerCount = this.players.size;
        const angle = (playerCount - 1) * (Math.PI * 2 / 6); // Max 6 players in circle
        
        const x = Math.cos(angle) * 3;
        const z = Math.sin(angle) * 3 - 5;
        
        const avatar = document.createElement('a-entity');
        avatar.setAttribute('id', `avatar-${playerData.playerId}`);
        
        // Use server position if available, otherwise use calculated position
        const serverPos = playerData.position;
        if (serverPos && playerData.playerId !== this.playerId) {
            avatar.setAttribute('position', `${serverPos.x} ${serverPos.y} ${serverPos.z}`);
        } else {
            avatar.setAttribute('position', `${x} 0 ${z}`);
        }
        
        // Simple avatar representation
        const head = document.createElement('a-sphere');
        head.setAttribute('radius', 0.3);
        head.setAttribute('color', '#FFB6C1');
        head.setAttribute('position', '0 1.7 0');
        
        const body = document.createElement('a-cylinder');
        body.setAttribute('radius', 0.3);
        body.setAttribute('height', 1);
        body.setAttribute('color', '#4169E1');
        body.setAttribute('position', '0 1 0');
        
        const nameTag = document.createElement('a-text');
        nameTag.setAttribute('value', playerData.playerName);
        nameTag.setAttribute('position', '0 2.2 0');
        nameTag.setAttribute('align', 'center');
        nameTag.setAttribute('color', '#000000');
        nameTag.setAttribute('scale', '0.8 0.8 0.8');
        
        avatar.appendChild(head);
        avatar.appendChild(body);
        avatar.appendChild(nameTag);
        
        avatarContainer.appendChild(avatar);
    }

    removePlayerAvatar(playerId) {
        const avatar = document.getElementById(`avatar-${playerId}`);
        if (avatar) {
            avatar.remove();
        }
    }

    createPlayerUI() {
        // Create status indicator
        const statusDiv = document.createElement('div');
        statusDiv.id = 'statusIndicator';
        statusDiv.className = 'status-indicator';
        statusDiv.textContent = '接続中...';
        document.body.appendChild(statusDiv);
        
        // Create player list
        const playerListDiv = document.createElement('div');
        playerListDiv.id = 'playerList';
        playerListDiv.className = 'player-list';
        playerListDiv.innerHTML = '<h4>プレイヤー</h4>';
        document.body.appendChild(playerListDiv);

        // Setup position tracking
        this.setupPositionTracking();
    }

    updateStatus(text, type) {
        const statusDiv = document.getElementById('statusIndicator');
        if (statusDiv) {
            statusDiv.textContent = text;
            statusDiv.className = `status-indicator status-${type}`;
        }
    }

    updatePlayerList() {
        const playerListDiv = document.getElementById('playerList');
        if (!playerListDiv) return;
        
        let html = '<h4>プレイヤー</h4>';
        this.players.forEach(player => {
            const statusClass = player.hasVoted ? 'voted' : 'waiting';
            const statusText = player.hasVoted ? '投票済み' : '待機中';
            
            html += `
                <div class="player-item">
                    <span>${player.playerName}</span>
                    <span class="player-status ${statusClass}">${statusText}</span>
                </div>
            `;
        });
        
        playerListDiv.innerHTML = html;
    }

    updateStory(story) {
        const storyBoard = document.getElementById('storyBoard');
        if (storyBoard) {
            storyBoard.setAttribute('value', `ストーリー: ${story}`);
        }
    }

    updateTimer(timeLeft) {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timerElement.setAttribute('value', `時間: ${timeString}`);
        }
    }

    handleAdminAction(action) {
        switch(action) {
            case 'reset':
                this.socket.emit('reset-game');
                console.log('Game reset requested');
                break;
            case 'reveal':
                this.socket.emit('admin-reveal-votes');
                console.log('Vote reveal requested');
                break;
            default:
                console.log('Unknown admin action:', action);
        }
    }

    setupPositionTracking() {
        const camera = document.getElementById('camera');
        if (!camera) return;

        let lastPosition = { x: 0, y: 0, z: 0 };
        let lastRotation = { x: 0, y: 0, z: 0 };

        // Track position changes
        setInterval(() => {
            if (!this.socket || !this.playerId) return;

            const position = camera.getAttribute('position');
            const rotation = camera.getAttribute('rotation');

            if (!position || !rotation) return;

            // Check if position has changed significantly
            const posChanged = Math.abs(position.x - lastPosition.x) > 0.1 ||
                              Math.abs(position.y - lastPosition.y) > 0.1 ||
                              Math.abs(position.z - lastPosition.z) > 0.1;

            const rotChanged = Math.abs(rotation.x - lastRotation.x) > 5 ||
                              Math.abs(rotation.y - lastRotation.y) > 5 ||
                              Math.abs(rotation.z - lastRotation.z) > 5;

            if (posChanged || rotChanged) {
                this.socket.emit('player-move', {
                    playerId: this.playerId,
                    position: position,
                    rotation: rotation
                });

                lastPosition = { ...position };
                lastRotation = { ...rotation };
            }
        }, 100); // Check every 100ms
    }

    updatePlayerPosition(playerId, position, rotation) {
        const avatar = document.getElementById(`avatar-${playerId}`);
        if (avatar && playerId !== this.playerId) {
            avatar.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
            avatar.setAttribute('rotation', `${rotation.x} ${rotation.y} ${rotation.z}`);
        }
    }
}

// Global functions for HTML onclick events
function joinRoom() {
    if (window.metaPoker) {
        window.metaPoker.joinRoom();
    }
}

// Initialize when page loads
window.addEventListener('load', () => {
    window.metaPoker = new MetaPoker();
});