class GameClient {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.worldImage = null;
        this.worldSize = 2048; // World is 2048x2048 pixels
        this.viewportX = 0; // Camera position (upper left corner)
        this.viewportY = 0;
        
        // WebSocket and game state
        this.ws = null;
        this.playerId = null;
        this.players = {};
        this.avatars = {};
        this.username = "Min";
        this.connected = false;
        
                  );
        } else {
            // Show loading message
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'Loading world map...',
                this.canvas.width / 2,
                this.canvas.height / 2
            );
        }
    }ate
        this.currentDirection = null;
        
        // UI elements
        this.ui = {
            minimap: document.getElementById('minimap'),
            minimapCtx: document.getElementById('minimap').getContext('2d'),
            playerList: document.getElementById('playerList'),
            playerCount: document.getElementById('playerCount'),
            playerName: document.getElementById('playerName'),
            playerCoords: document.getElementById('playerCoords'),
            statusText: document.getElementById('statusText'),
            statusIndicator: document.getElementById('statusIndicator'),
            fpsCounter: document.getElementById('fpsCounter'),
            pingDisplay: document.getElementById('pingDisplay')
        };
        
        // UI state
        this.minimapVisible = true;
        this.playerListVisible = true;
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.loadWorldMap();
        this.setupEventListeners();
        this.initializeUI();
        this.connectToServer();
        this.startGameLoop();
    }
    
    setupCanvas() {
        // Make canvas fill the browser window
        this.resizeCanvas();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.render();
        });
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    loadWorldMap() {
        this.worldImage = new Image();
        this.worldImage.onload = () => {
            console.log('World map loaded successfully');
            this.render();
        };
        this.worldImage.onerror = () => {
            console.error('Failed to load world map');
        };
        this.worldImage.src = 'world.jpg';
    }
    
    setupEventListeners() {
        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Handle keyboard input for movement
        window.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
        
        // Handle key release for stopping movement
        window.addEventListener('keyup', (e) => {
            this.handleKeyRelease(e);
        });
        
        // Handle mouse clicks for potential click-to-move
        this.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
        });
    }
    
    handleKeyPress(event) {
        // Prevent default behavior for arrow keys to stop page scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(event.code)) {
            event.preventDefault();
        }
        
        // Map keys to directions
        let direction = null;
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                direction = 'up';
                break;
            case 'ArrowDown':
            case 'KeyS':
                direction = 'down';
                break;
            case 'ArrowLeft':
            case 'KeyA':
                direction = 'left';
                break;
            case 'ArrowRight':
            case 'KeyD':
                direction = 'right';
                break;
            default:
                console.log('Key pressed:', event.key);
                return;
        }
        
        // Send move command for each keydown event (allows continuous movement)
        if (direction) {
            this.currentDirection = direction;
            this.sendMoveCommand(direction);
        }
    }
    
    handleKeyRelease(event) {
        // Check if this was a movement key
        const movementKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD'];
        if (movementKeys.includes(event.code)) {
            // Send stop command when movement key is released
            this.sendStopCommand();
            this.currentDirection = null;
        }
    }
    
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left + this.viewportX;
        const y = event.clientY - rect.top + this.viewportY;
        console.log('Click at world coordinates:', x, y);
    }
    
    initializeUI() {
        this.ui.playerName.textContent = this.username;
        this.updateConnectionStatus('connecting');
        this.updatePlayerList();
        this.setupUIEventListeners();
    }
    
    setupUIEventListeners() {
        // Minimap toggle
        document.getElementById('minimapToggle').addEventListener('click', () => {
            this.toggleMinimap();
        });
        
        // Keyboard shortcuts for UI
        window.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                this.toggleMinimap();
                e.preventDefault();
            } else if (e.key === 'Tab') {
                this.togglePlayerList();
                e.preventDefault();
            }
        });
    }
    
    toggleMinimap() {
        this.minimapVisible = !this.minimapVisible;
        const container = document.getElementById('minimapContainer');
        container.classList.toggle('hidden', !this.minimapVisible);
    }
    
    togglePlayerList() {
        this.playerListVisible = !this.playerListVisible;
        const container = document.getElementById('playerListContainer');
        container.classList.toggle('hidden', !this.playerListVisible);
    }
    
    updateConnectionStatus(status) {
        const statusText = this.ui.statusText;
        const statusIndicator = this.ui.statusIndicator;
        
        statusIndicator.className = `status-${status}`;
        
        switch (status) {
            case 'connected':
                statusText.textContent = 'Connected';
                break;
            case 'connecting':
                statusText.textContent = 'Connecting...';
                break;
            case 'disconnected':
                statusText.textContent = 'Disconnected';
                break;
        }
    }
    
    updatePlayerList() {
        const playerList = this.ui.playerList;
        const playerCount = this.ui.playerCount;
        
        playerList.innerHTML = '';
        
        const players = Object.values(this.players);
        playerCount.textContent = players.length;
        
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            if (player.id === this.playerId) {
                playerItem.classList.add('current-player');
            }
            
            const playerName = document.createElement('span');
            playerName.className = 'player-name';
            playerName.textContent = player.username || 'Unknown';
            
            const playerStatus = document.createElement('span');
            playerStatus.className = 'player-status';
            playerStatus.textContent = player.isMoving ? 'Moving' : 'Idle';
            
            playerItem.appendChild(playerName);
            playerItem.appendChild(playerStatus);
            playerList.appendChild(playerItem);
        });
    }
    
    updatePlayerCoordinates() {
        if (this.playerId && this.players[this.playerId]) {
            const player = this.players[this.playerId];
            this.ui.playerCoords.textContent = `(${Math.round(player.x)}, ${Math.round(player.y)})`;
        }
    }
    
    updateMinimap() {
        if (!this.minimapVisible) return;
        
        const ctx = this.ui.minimapCtx;
        const canvas = this.ui.minimap;
        
        // Clear minimap
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw world bounds
        ctx.strokeStyle = '#444';
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scale
        const scale = canvas.width / this.worldSize;
        
        // Draw players
        for (const playerId in this.players) {
            const player = this.players[playerId];
            const x = player.x * scale;
            const y = player.y * scale;
            
            if (player.id === this.playerId) {
                // Current player - green dot
                ctx.fillStyle = '#00ff00';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw view area
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
                ctx.strokeRect(
                    this.viewportX * scale,
                    this.viewportY * scale,
                    this.canvas.width * scale,
                    this.canvas.height * scale
                );
            } else {
                // Other players - yellow dots
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    
    calculateFPS() {
        this.frameCount++;
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastFrameTime;
        
        if (elapsed >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / elapsed);
            this.ui.fpsCounter.textContent = `FPS: ${this.fps}`;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }
    }
    
    startGameLoop() {
        const gameLoop = () => {
            this.calculateFPS();
            this.updatePlayerCoordinates();
            this.updateMinimap();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
    
    sendMoveCommand(direction) {
        if (!this.connected || !this.ws) {
            console.log('Cannot send move command: not connected to server');
            return;
        }
        
        const moveMessage = {
            action: "move",
            direction: direction
        };
        
        console.log('Sending move command:', moveMessage);
        this.ws.send(JSON.stringify(moveMessage));
    }
    
    sendStopCommand() {
        if (!this.connected || !this.ws) {
            console.log('Cannot send stop command: not connected to server');
            return;
        }
        
        const stopMessage = {
            action: "stop"
        };
        
        console.log('Sending stop command:', stopMessage);
        this.ws.send(JSON.stringify(stopMessage));
    }
    
    connectToServer() {
        console.log('Connecting to game server...');
        this.ws = new WebSocket('wss://codepath-mmorg.onrender.com');
        
        this.ws.onopen = () => {
            console.log('Connected to game server');
            this.connected = true;
            this.updateConnectionStatus('connected');
            this.joinGame();
        };
        
        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleServerMessage(message);
            } catch (error) {
                console.error('Error parsing server message:', error);
            }
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected from game server');
            this.connected = false;
            this.updateConnectionStatus('disconnected');
            // Attempt to reconnect after a delay
            setTimeout(() => {
                if (!this.connected) {
                    this.updateConnectionStatus('connecting');
                    this.connectToServer();
                }
            }, 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    joinGame() {
        if (!this.connected || !this.ws) return;
        
        const joinMessage = {
            action: "join_game",
            username: this.username
            // No custom avatar for now - server will provide one
        };
        
        console.log('Sending join_game message:', joinMessage);
        this.ws.send(JSON.stringify(joinMessage));
    }
    
    handleServerMessage(message) {
        console.log('Received message:', message);
        
        switch (message.action) {
            case 'join_game':
                if (message.success) {
                    this.handleJoinGameSuccess(message);
                } else {
                    console.error('Failed to join game:', message.error);
                }
                break;
            case 'player_joined':
                this.handlePlayerJoined(message);
                break;
            case 'players_moved':
                this.handlePlayersMove(message);
                break;
            case 'player_left':
                this.handlePlayerLeft(message);
                break;
            default:
                console.log('Unknown message type:', message.action);
        }
    }
    
    handleJoinGameSuccess(message) {
        console.log('Successfully joined game!');
        this.playerId = message.playerId;
        this.players = message.players || {};
        this.avatars = message.avatars || {};
        
        console.log('Player ID:', this.playerId);
        console.log('Total players in game:', Object.keys(this.players).length);
        
        // Log all player positions
        for (const playerId in this.players) {
            const player = this.players[playerId];
            const isMe = playerId === this.playerId;
            console.log(`Player: ${player.username} ${isMe ? '(ME)' : ''} at (${player.x}, ${player.y})`);
        }
        
        console.log('Avatars:', Object.keys(this.avatars));
        
        // Load avatar images
        this.loadAvatarImages();
        
        // Center viewport on our player
        this.centerViewportOnPlayer();
        
        // Update UI
        this.updatePlayerList();
        this.ui.playerCountDisplay.textContent = `Players: ${Object.keys(this.players).length}`;
        
        // Render the game
        this.render();
    }
    
    handlePlayerJoined(message) {
        if (message.player) {
            console.log('New player joined:', message.player);
            this.players[message.player.id] = message.player;
            if (message.avatar) {
                console.log('Loading avatar for new player:', message.avatar.name);
                this.avatars[message.avatar.name] = message.avatar;
                this.loadAvatarImage(message.avatar);
            }
            this.updatePlayerList();
            this.render();
        }
    }
    
    handlePlayersMove(message) {
        if (message.players) {
            console.log('Players moved:', Object.keys(message.players).length, 'players');
            // Update player positions
            for (const playerId in message.players) {
                if (this.players[playerId]) {
                    Object.assign(this.players[playerId], message.players[playerId]);
                } else {
                    console.log('Received movement for unknown player:', playerId);
                }
            }
            
            // If our player moved, update viewport
            if (message.players[this.playerId]) {
                this.centerViewportOnPlayer();
            }
            
            this.updatePlayerList();
            this.render();
        }
    }
    
    handlePlayerLeft(message) {
        if (message.playerId && this.players[message.playerId]) {
            delete this.players[message.playerId];
            this.updatePlayerList();
            this.render();
        }
    }
    
    loadAvatarImages() {
        for (const avatarName in this.avatars) {
            this.loadAvatarImage(this.avatars[avatarName]);
        }
    }
    
    loadAvatarImage(avatar) {
        if (!avatar.loadedImages) {
            avatar.loadedImages = {};
        }
        
        // Load images for each direction
        for (const direction in avatar.frames) {
            if (!avatar.loadedImages[direction]) {
                avatar.loadedImages[direction] = [];
            }
            
            avatar.frames[direction].forEach((frameData, index) => {
                if (!avatar.loadedImages[direction][index]) {
                    const img = new Image();
                    img.onload = () => {
                        console.log(`Loaded ${avatar.name} ${direction} frame ${index}`);
                        this.render(); // Re-render when image loads
                    };
                    img.src = frameData;
                    avatar.loadedImages[direction][index] = img;
                }
            });
        }
    }
    
    centerViewportOnPlayer() {
        if (!this.playerId || !this.players[this.playerId]) return;
        
        const player = this.players[this.playerId];
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Calculate desired viewport position to center player
        let newViewportX = player.x - centerX;
        let newViewportY = player.y - centerY;
        
        // Clamp viewport to map boundaries
        newViewportX = Math.max(0, Math.min(newViewportX, this.worldSize - this.canvas.width));
        newViewportY = Math.max(0, Math.min(newViewportY, this.worldSize - this.canvas.height));
        
        this.viewportX = newViewportX;
        this.viewportY = newViewportY;
    }
    
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.worldImage && this.worldImage.complete) {
            // Draw the world map at actual size, starting from upper left (0,0)
            // The viewport shows the portion of the world map starting at viewportX, viewportY
            this.ctx.drawImage(
                this.worldImage,
                this.viewportX, this.viewportY, // Source x, y
                this.canvas.width, this.canvas.height, // Source width, height
                0, 0, // Destination x, y
                this.canvas.width, this.canvas.height // Destination width, height
            );
            
            // Draw all players
            this.renderPlayers();
        } else {
            // Show loading message
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'Loading world map...',
                this.canvas.width / 2,
                this.canvas.height / 2
            );
        }
        
        // Show connection status
        this.renderConnectionStatus();
    }
    
    renderPlayers() {
        const playerCount = Object.keys(this.players).length;
        const otherPlayerCount = playerCount - 1; // Exclude ourselves
        
        // Only log occasionally to avoid spam
        if (otherPlayerCount > 0 && Math.random() < 0.1) {
            console.log(`Rendering ${playerCount} total players (${otherPlayerCount} others)`);
        }
        
        for (const playerId in this.players) {
            const player = this.players[playerId];
            this.renderPlayer(player);
        }
    }
    
    renderPlayer(player) {
        // Convert world coordinates to screen coordinates
        const screenX = player.x - this.viewportX;
        const screenY = player.y - this.viewportY;
        
        // Debug: Log player rendering info (occasionally to avoid spam)
        if (player.id !== this.playerId && Math.random() < 0.1) {
            console.log(`Player ${player.username} at world(${player.x}, ${player.y}) screen(${screenX}, ${screenY}) viewport(${this.viewportX}, ${this.viewportY})`);
        }
        
        // Only render if player is visible on screen (expanded range for debugging)
        if (screenX < -500 || screenX > this.canvas.width + 500 || 
            screenY < -500 || screenY > this.canvas.height + 500) {
            if (player.id !== this.playerId) {
                console.log(`Player ${player.username} is off-screen, skipping render`);
            }
            return;
        }
        
        // Get avatar data
        const avatar = this.avatars[player.avatar];
        if (!avatar || !avatar.loadedImages) {
            console.log(`Avatar not loaded for player ${player.username}, using placeholder`);
            // Draw placeholder if avatar not loaded
            this.renderPlayerPlaceholder(screenX, screenY, player);
            return;
        }
        
        // Determine which direction and frame to show
        let direction = player.facing || 'south';
        if (direction === 'west') {
            direction = 'east'; // We'll flip the east image
        }
        
        const frameIndex = player.animationFrame || 0;
        const directionFrames = avatar.loadedImages[direction];
        
        if (!directionFrames || !directionFrames[frameIndex]) {
            this.renderPlayerPlaceholder(screenX, screenY, player);
            return;
        }
        
        const avatarImage = directionFrames[frameIndex];
        if (!avatarImage.complete) {
            this.renderPlayerPlaceholder(screenX, screenY, player);
            return;
        }
        
        // Save context for potential flipping
        this.ctx.save();
        
        // Calculate avatar position (center the avatar on the player coordinates)
        const avatarWidth = avatarImage.width;
        const avatarHeight = avatarImage.height;
        const avatarX = screenX - avatarWidth / 2;
        const avatarY = screenY - avatarHeight / 2;
        
        // Flip horizontally for west direction
        if (player.facing === 'west') {
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(avatarImage, -avatarX - avatarWidth, avatarY, avatarWidth, avatarHeight);
        } else {
            this.ctx.drawImage(avatarImage, avatarX, avatarY, avatarWidth, avatarHeight);
        }
        
        this.ctx.restore();
        
        // Draw username label
        this.renderPlayerLabel(screenX, screenY - avatarHeight / 2 - 10, player);
    }
    
    renderPlayerPlaceholder(screenX, screenY, player) {
        // Draw a simple colored circle as placeholder
        this.ctx.fillStyle = player.id === this.playerId ? '#00ff00' : '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, 15, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw username label
        this.renderPlayerLabel(screenX, screenY - 25, player);
    }
    
    renderPlayerLabel(x, y, player) {
        const username = player.username || 'Unknown';
        
        // Set up text style
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        
        // Measure text for background
        const textMetrics = this.ctx.measureText(username);
        const textWidth = textMetrics.width;
        const textHeight = 16;
        
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x - textWidth / 2 - 4, y - textHeight - 2, textWidth + 8, textHeight + 4);
        
        // Draw text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(username, x, y);
    }
    
    renderConnectionStatus() {
        const status = this.connected ? 'Connected' : 'Connecting...';
        const color = this.connected ? '#00ff00' : '#ffff00';
        
        this.ctx.fillStyle = color;
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(status, 10, 10);
        
        if (this.playerId) {
            this.ctx.fillText(`Player: ${this.username} (${this.playerId})`, 10, 30);
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new GameClient();
});