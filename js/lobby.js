// Lobby management for SameGame

// Use API_BASE if already defined (e.g., from tile-set-loader.js), otherwise define it
if (typeof API_BASE === 'undefined') {
    var API_BASE = window.location.origin + '/api';
}

let checkInterval = null;

// Set default player name and game settings from localStorage
window.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('samegame_username');
    const hostNameInput = document.getElementById('hostNameInput');
    const joinNameInput = document.getElementById('joinNameInput');
    
    if (hostNameInput) {
        hostNameInput.value = username || '';
    }
    if (joinNameInput) {
        joinNameInput.value = username || '';
    }
    
    // Load saved game settings from single player mode
    const savedWidth = localStorage.getItem('samegame_grid_width');
    const savedHeight = localStorage.getItem('samegame_grid_height');
    const savedTileTypes = localStorage.getItem('samegame_tile_types');
    const savedTileSet = localStorage.getItem('samegame_tile_set');
    
    // Set defaults from localStorage, or use standard defaults if not set
    document.getElementById('gridWidthInput').value = savedWidth || 40;
    document.getElementById('gridHeightInput').value = savedHeight || 20;
    document.getElementById('numTileTypesInput').value = savedTileTypes || 5;
    
    // Populate tile set dropdown and set saved value
    populateTileSetSelect(document.getElementById('tileSetSelect'), savedTileSet || 'Letters').then(() => {
        // Load and display tile preview
        updateTilePreview(document.getElementById('tileSetSelect').value);
        
        // Update tile preview when tile set changes
        document.getElementById('tileSetSelect').addEventListener('change', (e) => {
            updateTilePreview(e.target.value);
        });
    });
    
    // Save name to localStorage when user types in either name field
    document.getElementById('hostNameInput').addEventListener('blur', (e) => {
        const name = e.target.value.trim();
        if (name) {
            localStorage.setItem('samegame_username', name);
            // Also update the join name field
            document.getElementById('joinNameInput').value = name;
        }
    });
    
    document.getElementById('joinNameInput').addEventListener('blur', (e) => {
        const name = e.target.value.trim();
        if (name) {
            localStorage.setItem('samegame_username', name);
            // Also update the host name field
            document.getElementById('hostNameInput').value = name;
        }
    });
});

document.getElementById('createGameBtn').addEventListener('click', createGame);
document.getElementById('joinGameBtn').addEventListener('click', joinGame);

// Allow Enter key to submit
document.getElementById('hostNameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createGame();
});

document.getElementById('joinCodeInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinGame();
});

// Function to update tile preview
function updateTilePreview(tileSet) {
    const previewContainer = document.getElementById('tilePreview');
    if (!previewContainer) return;
    
    // Clear existing preview
    previewContainer.innerHTML = '';
    
    // Load and display first 6 tiles (A-F, which correspond to tile types 1-6)
    const imageNames = ['A', 'B', 'C', 'D', 'E', 'F'];
    const imagePath = `images/${tileSet}/`;
    
    // Add cache-busting timestamp to force reload of updated images
    const cacheBuster = '?v=' + Date.now();
    
    imageNames.forEach((name, index) => {
        const img = document.createElement('img');
        img.src = `${imagePath}${name}.gif${cacheBuster}`;
        img.alt = `Tile ${name}`;
        img.title = `Tile ${name}`;
        img.onerror = function() {
            // If image fails to load, remove it or show placeholder
            this.style.display = 'none';
        };
        previewContainer.appendChild(img);
    });
}

async function createGame() {
    const playerName = document.getElementById('hostNameInput').value.trim() || 'Player 1';
    const gridWidth = parseInt(document.getElementById('gridWidthInput').value) || 40;
    const gridHeight = parseInt(document.getElementById('gridHeightInput').value) || 20;
    const movesPerTurn = parseInt(document.getElementById('movesPerTurnInput').value) || 1;
    const numTileTypes = parseInt(document.getElementById('numTileTypesInput').value) || 5;
    const tileSet = document.getElementById('tileSetSelect').value || 'Letters';
    const btn = document.getElementById('createGameBtn');
    
    btn.disabled = true;
    btn.textContent = 'Creating...';
    
    // Save player name to localStorage if provided
    if (playerName && playerName !== 'Player 1') {
        localStorage.setItem('samegame_username', playerName);
        document.getElementById('joinNameInput').value = playerName;
    }
    
    // Save tile set to localStorage
    localStorage.setItem('samegame_tile_set', tileSet);
    
    try {
        const formData = new URLSearchParams();
        formData.append('player_name', playerName);
        formData.append('grid_width', Math.max(20, Math.min(60, gridWidth)));
        formData.append('grid_height', Math.max(10, Math.min(30, gridHeight)));
        formData.append('moves_per_turn', Math.max(1, Math.min(5, movesPerTurn)));
        formData.append('num_tile_types', Math.max(2, Math.min(6, numTileTypes)));
        formData.append('tile_set', tileSet);
        
        const response = await fetch(`${API_BASE}/create-game.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store session and game code
            localStorage.setItem('samegame_session', data.session);
            localStorage.setItem('samegame_code', data.game_code);
            localStorage.setItem('samegame_player', '1');
            localStorage.setItem('samegame_name', data.player_name);
            
            // Show game code
            document.getElementById('gameCode').textContent = data.game_code;
            document.getElementById('gameCodeDisplay').classList.remove('hidden');
            document.getElementById('createGameBtn').style.display = 'none';
            
            // Start checking for player 2
            checkInterval = setInterval(checkForPlayer2, 2000);
        } else {
            alert('Failed to create game: ' + (data.error || 'Unknown error'));
            btn.disabled = false;
            btn.textContent = 'Create Game';
        }
    } catch (error) {
        console.error('Error creating game:', error);
        alert('Error creating game. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Create Game';
    }
}

async function checkForPlayer2() {
    const gameCode = localStorage.getItem('samegame_code');
    const session = localStorage.getItem('samegame_session');
    
    if (!gameCode || !session) return;
    
    try {
        const response = await fetch(`${API_BASE}/get-game-state.php?game_code=${gameCode}&session=${session}`);
        const data = await response.json();
        
        if (data.success && data.game_status !== 'waiting') {
            // Player 2 joined!
            clearInterval(checkInterval);
            window.location.href = 'game.html';
        }
    } catch (error) {
        console.error('Error checking game state:', error);
    }
}

async function joinGame() {
    const gameCode = document.getElementById('joinCodeInput').value.trim().toUpperCase();
    const playerName = document.getElementById('joinNameInput').value.trim() || 'Player 2';
    const btn = document.getElementById('joinGameBtn');
    const errorDiv = document.getElementById('joinError');
    
    if (gameCode.length !== 4) {
        errorDiv.textContent = 'Please enter a valid 4-character game code';
        errorDiv.classList.remove('hidden');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Joining...';
    errorDiv.classList.add('hidden');
    
    // Save player name to localStorage if provided
    if (playerName && playerName !== 'Player 2') {
        localStorage.setItem('samegame_username', playerName);
        document.getElementById('hostNameInput').value = playerName;
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('game_code', gameCode);
        formData.append('player_name', playerName);
        
        const response = await fetch(`${API_BASE}/join-game.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store session and game code
            localStorage.setItem('samegame_session', data.session);
            localStorage.setItem('samegame_code', data.game_code);
            localStorage.setItem('samegame_player', '2');
            localStorage.setItem('samegame_name', data.player_name);
            
            // Redirect to game
            window.location.href = 'game.html';
        } else {
            errorDiv.textContent = data.error || 'Failed to join game';
            errorDiv.classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = 'Join Game';
        }
    } catch (error) {
        console.error('Error joining game:', error);
        errorDiv.textContent = 'Error joining game. Please try again.';
        errorDiv.classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = 'Join Game';
    }
}

