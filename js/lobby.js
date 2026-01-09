// Lobby management for SameGame

// Use window.API_BASE to avoid redeclaration conflicts with tile-set-loader.js
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = window.location.origin + '/api';
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
    document.getElementById('numTileTypesInput').value = savedTileTypes || 4;
    
    // Populate tile set dropdown and set saved value
    populateTileSetSelect(document.getElementById('tileSetSelect'), savedTileSet || 'Squares').then(() => {
        // Load and display tile preview
        const initialTileSet = document.getElementById('tileSetSelect').value || 'Squares';
        updateTilePreview(initialTileSet);
        
        // Update tile preview when tile set changes
        document.getElementById('tileSetSelect').addEventListener('change', (e) => {
            updateTilePreview(e.target.value);
        });
        
        // Update multiplier images when tile types input changes
        document.getElementById('numTileTypesInput').addEventListener('input', (e) => {
            const tileSet = document.getElementById('tileSetSelect').value || 'Squares';
            updateMultiplierTileImages(tileSet);
        });
        
        // Initial update of multiplier images
        const initialTileSet = document.getElementById('tileSetSelect').value || 'Squares';
        updateMultiplierTileImages(initialTileSet);
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
    
    // Handle timer checkbox - show/hide timer input
    const timerCheckbox = document.getElementById('timerCheckbox');
    const timerInputContainer = document.getElementById('timerInputContainer');
    const autoSelectCheckbox = document.getElementById('autoSelectCheckbox');
    
    timerCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            timerInputContainer.style.display = 'block';
        } else {
            timerInputContainer.style.display = 'none';
            // Disable auto-select if timer is disabled
            autoSelectCheckbox.checked = false;
        }
    });
    
    // Auto-select requires timer to be enabled
    autoSelectCheckbox.addEventListener('change', (e) => {
        if (e.target.checked && !timerCheckbox.checked) {
            alert('Auto-select requires timer to be enabled.');
            e.target.checked = false;
            timerCheckbox.checked = true;
            timerInputContainer.style.display = 'block';
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
    
    // Update multiplier tile images
    updateMultiplierTileImages(tileSet);
}

// Function to update tile images in the multiplier text
function updateMultiplierTileImages(tileSet) {
    const multiplierContainer = document.getElementById('multiplierTileImages');
    if (!multiplierContainer) return;
    
    // Get the number of tile types selected
    const numTileTypes = parseInt(document.getElementById('numTileTypesInput').value) || 4;
    const maxTileTypes = Math.max(2, Math.min(6, numTileTypes));
    
    const tileNames = ['A', 'B', 'C', 'D', 'E', 'F'];
    const multipliers = ['1x', '1.25x', '1.5x', '1.75x', '2.0x', '2.25x'];
    const imagePath = `images/${tileSet}/`;
    const cacheBuster = '?v=' + Date.now();
    
    // Clear existing items
    multiplierContainer.innerHTML = '';
    
    // Only show tiles up to the selected number of tile types
    for (let index = 0; index < maxTileTypes; index++) {
        const name = tileNames[index];
        const item = document.createElement('span');
        item.className = 'multiplier-item';
        
        // Create wrapper for tile image
        const tileWrapper = document.createElement('span');
        tileWrapper.className = 'multiplier-tile';
        
        // Create image element for the tile
        const img = document.createElement('img');
        img.src = `${imagePath}${name}.gif${cacheBuster}`;
        img.alt = `Tile ${name}`;
        img.title = `Tile ${name} - ${multipliers[index]}`;
        img.className = 'multiplier-tile-img';
        
        // Add fallback text that shows if image fails to load
        const fallback = document.createElement('span');
        fallback.className = 'multiplier-tile-fallback';
        fallback.textContent = name;
        fallback.style.display = 'none';
        
        img.onerror = function() {
            // If image fails to load, show the letter as fallback
            this.style.display = 'none';
            fallback.style.display = 'flex';
        };
        
        img.onload = function() {
            // Hide fallback when image loads successfully
            fallback.style.display = 'none';
        };
        
        tileWrapper.appendChild(img);
        tileWrapper.appendChild(fallback);
        
        // Create text for multiplier (e.g., "A=1x")
        const text = document.createElement('span');
        text.className = 'multiplier-text';
        text.textContent = `${name}=${multipliers[index]}`;
        
        // Structure: [Tile Image] A=1x
        item.appendChild(tileWrapper);
        item.appendChild(text);
        
        multiplierContainer.appendChild(item);
    }
}

async function createGame() {
    const playerName = document.getElementById('hostNameInput').value.trim() || 'Player 1';
    const gridWidth = parseInt(document.getElementById('gridWidthInput').value) || 40;
    const gridHeight = parseInt(document.getElementById('gridHeightInput').value) || 20;
    const movesPerTurn = parseInt(document.getElementById('movesPerTurnInput').value) || 1;
    const numTileTypes = parseInt(document.getElementById('numTileTypesInput').value) || 4;
    const tileSet = document.getElementById('tileSetSelect').value || 'Squares';
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
    
    // Get game options
    const tileTypeMultiplierEnabled = document.getElementById('tileTypeMultiplierCheckbox').checked;
    const timerEnabled = document.getElementById('timerCheckbox').checked;
    const timerSeconds = timerEnabled ? parseInt(document.getElementById('timerSecondsInput').value) || 60 : 0;
    const timerMode = timerEnabled ? (document.querySelector('input[name="timerMode"]:checked')?.value || 'per_move') : 'per_move';
    const autoSelectEnabled = timerEnabled && document.getElementById('autoSelectCheckbox').checked;
    
    // Validate timer seconds
    const validTimerSeconds = timerEnabled ? Math.max(15, Math.min(180, timerSeconds)) : 0;
    
    console.log('Creating game with options:', {
        tileTypeMultiplierEnabled,
        timerEnabled,
        timerSeconds: validTimerSeconds,
        timerMode,
        autoSelectEnabled
    });
    
    try {
        const formData = new URLSearchParams();
        formData.append('player_name', playerName);
        formData.append('grid_width', Math.max(20, Math.min(60, gridWidth)));
        formData.append('grid_height', Math.max(10, Math.min(30, gridHeight)));
        formData.append('moves_per_turn', Math.max(1, Math.min(5, movesPerTurn)));
        formData.append('num_tile_types', Math.max(2, Math.min(6, numTileTypes)));
        formData.append('tile_set', tileSet);
        formData.append('tile_type_multiplier_enabled', tileTypeMultiplierEnabled ? '1' : '0');
        formData.append('timer_enabled', timerEnabled ? '1' : '0');
        formData.append('timer_seconds', validTimerSeconds);
        formData.append('timer_mode', timerMode);
        formData.append('auto_select_enabled', autoSelectEnabled ? '1' : '0');
        
        const response = await fetch(`${window.API_BASE}/create-game.php`, {
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
        const response = await fetch(`${window.API_BASE}/get-game-state.php?game_code=${gameCode}&session=${session}`);
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
        
        const response = await fetch(`${window.API_BASE}/join-game.php`, {
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

