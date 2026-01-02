// SameGame Multiplayer - Two Player Version
// Based on original SameGame by Paul Butler

const API_BASE = window.location.origin + '/api';

class SameGameMultiplayer {
    constructor() {
        // Get game session info
        this.gameCode = localStorage.getItem('samegame_code');
        this.session = localStorage.getItem('samegame_session');
        this.playerName = localStorage.getItem('samegame_name') || 'Player';
        // Player number will be determined by the server
        this.playerNumber = parseInt(localStorage.getItem('samegame_player') || '1');
        
        if (!this.gameCode || !this.session) {
            alert('No game session found. Redirecting to lobby...');
            window.location.href = 'lobby.html';
            return;
        }
        
        // Game configuration (will be loaded from server)
        this.gridHeight = 20;
        this.gridWidth = 40;
        this.tileSet = 'Letters'; // Will be loaded from server
        this.imageWidth = 20;
        this.imageHeight = 20;
        
        // Game state
        this.myScore = 0;
        this.opponentScore = 0;
        this.theNumberSelected = 0;
        this.theLastValue = 0;
        this.gameOver = false;
        this.isMyTurn = false;
        this.currentPlayer = 1;
        this.gameStatus = 'waiting';
        this.movesPerTurn = 1;
        this.currentMoveCount = 0;
        this.numTileTypes = 5; // Default to 5 (A-E)
        
        // Player info
        this.player1Name = '';
        this.player2Name = '';
        
        // Grids
        this.fullGrid = [];
        this.undoGrid = [];
        this.redoGrid = [];
        this.selectionGrid = [];
        
        // Images
        this.images = {};
        this.imagesLoaded = false;
        
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Initialize grids
        this.initGrids();
        
        // Load images and start
        this.loadImages().then(() => {
            this.loadGameState();
            this.setupEventListeners();
            this.startPolling();
        });
    }
    
    setupCanvas() {
        this.canvas.width = this.imageWidth * this.gridWidth;
        this.canvas.height = this.imageHeight * this.gridHeight;
        const scale = Math.min(window.innerWidth / this.canvas.width, 
                              (window.innerHeight - 200) / this.canvas.height, 2);
        this.canvas.style.width = (this.canvas.width * scale) + 'px';
        this.canvas.style.height = (this.canvas.height * scale) + 'px';
    }
    
    initGrids() {
        for (let row = 0; row <= this.gridHeight; row++) {
            this.fullGrid[row] = [];
            this.undoGrid[row] = [];
            this.redoGrid[row] = [];
            this.selectionGrid[row] = [];
            for (let col = 0; col <= this.gridWidth; col++) {
                this.fullGrid[row][col] = 10;
                this.undoGrid[row][col] = 10;
                this.redoGrid[row][col] = 10;
                this.selectionGrid[row][col] = 10;
            }
        }
    }
    
    async loadImages() {
        // Load all possible tile images (A-F and selected versions As-Fs)
        // Add cache-busting timestamp to force reload of updated images
        const cacheBuster = '?v=' + Date.now();
        const imageNames = ['A', 'B', 'C', 'D', 'E', 'F', 'As', 'Bs', 'Cs', 'Ds', 'Es', 'Fs'];
        const imagePath = `images/${this.tileSet}/`;
        const loadPromises = imageNames.map(name => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = `${imagePath}${name}.gif${cacheBuster}`;
                img.onload = () => {
                    this.images[name] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load image: ${imagePath}${name}.gif`);
                    resolve(); // Continue even if image fails
                };
            });
        });
        await Promise.all(loadPromises);
        this.imagesLoaded = true;
        console.log(`Images loaded from tile set: ${this.tileSet}`, Object.keys(this.images));
    }
    
    async loadGameState() {
        // Make this function async to properly handle await
        try {
            console.log('Loading game state with:', {
                gameCode: this.gameCode,
                session: this.session,
                sessionLength: this.session ? this.session.length : 0
            });
            const response = await fetch(`${API_BASE}/get-game-state.php?game_code=${encodeURIComponent(this.gameCode)}&session=${encodeURIComponent(this.session)}`);
            const data = await response.json();
            
            if (data.success) {
                this.player1Name = data.player1_name;
                this.player2Name = data.player2_name || '';
                this.myScore = data.player_number === 1 ? data.player1_score : data.player2_score;
                this.opponentScore = data.opponent_score;
                this.gameStatus = data.game_status;
                this.playerNumber = parseInt(data.player_number); // Make sure we use the server's player number as int
                this.currentPlayer = parseInt(data.current_player); // Ensure it's an int
                this.isMyTurn = (this.currentPlayer === this.playerNumber);
                this.movesPerTurn = parseInt(data.moves_per_turn || 1);
                this.currentMoveCount = parseInt(data.current_move_count || 0);
                this.numTileTypes = parseInt(data.num_tile_types || 5);
                const newTileSet = data.tile_set || 'Letters';
                
                // Check if tile set changed - need to reload images
                const tileSetChanged = this.tileSet !== newTileSet;
                this.tileSet = newTileSet;
                
                // Update grid dimensions if they differ (should only happen once on first load)
                const newGridWidth = parseInt(data.grid_width || 40);
                const newGridHeight = parseInt(data.grid_height || 20);
                if (newGridWidth !== this.gridWidth || newGridHeight !== this.gridHeight) {
                    console.log('Updating grid dimensions from', `${this.gridWidth}x${this.gridHeight}`, 'to', `${newGridWidth}x${newGridHeight}`);
                    this.gridWidth = newGridWidth;
                    this.gridHeight = newGridHeight;
                    this.setupCanvas();
                    this.initGrids();
                    // Reload grid if available after resizing
                    if (data.your_grid && Array.isArray(data.your_grid) && data.your_grid.length > 0) {
                        this.loadGrid(data.your_grid);
                    }
                }
                
                // Reload images if tile set changed
                if (tileSetChanged) {
                    console.log('Tile set changed to:', newTileSet, '- reloading images');
                    this.imagesLoaded = false;
                    await this.loadImages();
                }
                
                console.log('Game state loaded:', {
                    playerNumber: this.playerNumber,
                    currentPlayer: this.currentPlayer,
                    isMyTurn: this.isMyTurn,
                    gameStatus: this.gameStatus,
                    movesPerTurn: this.movesPerTurn,
                    currentMoveCount: this.currentMoveCount,
                    numTileTypes: this.numTileTypes,
                    gridWidth: this.gridWidth,
                    gridHeight: this.gridHeight,
                    player1Name: this.player1Name,
                    player2Name: this.player2Name
                });
                
                // Load grid if available
                if (data.your_grid && Array.isArray(data.your_grid) && data.your_grid.length > 0) {
                    this.loadGrid(data.your_grid);
                    this.paint();
                } else if (this.gameStatus === 'waiting') {
                    // Still waiting for player 2, no grid yet
                    console.log('Waiting for player 2 to join...');
                } else {
                    // Grid should be available, but if not, wait for next poll
                    console.warn('Grid not available yet, will retry...');
                }
                
                // Hide waiting modal if it's our turn
                if (this.isMyTurn) {
                    document.getElementById('waitingModal').style.display = 'none';
                } else if (this.gameStatus !== 'waiting' && this.player2Name) {
                    document.getElementById('waitingModal').style.display = 'block';
                }
                
                this.updateUI();
                this.paint();
            }
        } catch (error) {
            console.error('Error loading game state:', error);
        }
    }
    
    loadGrid(gridData) {
        if (gridData && Array.isArray(gridData)) {
            // Initialize grid first
            for (let row = 0; row <= this.gridHeight; row++) {
                for (let col = 0; col <= this.gridWidth; col++) {
                    this.fullGrid[row][col] = 10;
                }
            }
            
            // Load grid data
            for (let row = 0; row < gridData.length && row < this.gridHeight; row++) {
                if (gridData[row] && Array.isArray(gridData[row])) {
                    for (let col = 0; col < gridData[row].length && col < this.gridWidth; col++) {
                        const value = gridData[row][col];
                        // Accept any valid tile value (0 to 9, but should be 0 to numTileTypes-1)
                        if (value !== null && value !== undefined && value !== 10 && 
                            typeof value === 'number' && value >= 0 && value < 10) {
                            this.fullGrid[row][col] = value;
                        }
                    }
                }
            }
            
            // Save to redoGrid for replay
            for (let col = 0; col < this.gridWidth; col++) {
                for (let row = 0; row < this.gridHeight; row++) {
                    this.redoGrid[row][col] = this.fullGrid[row][col];
                }
            }
            
            // Debug: count filled vs empty cells
            let filledCount = 0;
            let emptyCount = 0;
            for (let row = 0; row < this.gridHeight; row++) {
                for (let col = 0; col < this.gridWidth; col++) {
                    if (this.fullGrid[row][col] === 10) {
                        emptyCount++;
                    } else {
                        filledCount++;
                    }
                }
            }
            console.log(`Grid loaded: ${filledCount} filled, ${emptyCount} empty out of ${this.gridWidth * this.gridHeight} total`);
        }
    }
    
    newGame() {
        this.setupGridRandom();
        this.blocksFallNow();
        this.bringThemTogether();
    }
    
    setupGridRandom() {
        this.myScore = 0;
        this.theNumberSelected = 0;
        this.gameOver = false;
        
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                this.fullGrid[row][col] = 10;
                this.selectionGrid[row][col] = 10;
            }
        }
        
        let numberLeft = this.gridWidth * this.gridHeight;
        while (numberLeft > 100) {
            const myColumn = Math.floor(Math.random() * (this.gridWidth - 1));
            const myRow = Math.floor(Math.random() * (this.gridHeight - 1));
            if (this.fullGrid[myRow][myColumn] === 10) {
                const randomNumber = Math.floor(Math.random() * this.numTileTypes);
                this.fullGrid[myRow][myColumn] = randomNumber;
                numberLeft--;
            }
        }
        
        for (let col = 0; col < this.gridWidth; col++) {
            for (let row = 0; row < this.gridHeight; row++) {
                if (this.fullGrid[row][col] === 10) {
                    const randomNumber = Math.floor(Math.random() * this.numTileTypes);
                    this.fullGrid[row][col] = randomNumber;
                    numberLeft--;
                }
                this.redoGrid[row][col] = this.fullGrid[row][col];
            }
        }
    }
    
    blocksFallNow() {
        for (let col = 0; col < this.gridWidth; col++) {
            for (let row = this.gridHeight - 1; row >= 1; row--) {
                if (this.fullGrid[row][col] === 10) {
                    for (let next = row - 1; next >= 0; next--) {
                        if (this.fullGrid[next][col] !== 10) {
                            this.fullGrid[row][col] = this.fullGrid[next][col];
                            this.fullGrid[next][col] = 10;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    bringThemTogether() {
        for (let col = 0; col < this.gridWidth; col++) {
            let goodColumn = false;
            for (let row = 0; row <= this.gridHeight; row++) {
                if (this.fullGrid[row][col] !== 10) {
                    goodColumn = true;
                    break;
                }
            }
            if (!goodColumn) {
                for (let nextCol = col + 1; nextCol <= this.gridWidth; nextCol++) {
                    for (let row = 0; row <= this.gridHeight; row++) {
                        if (this.fullGrid[row][nextCol] !== 10) {
                            goodColumn = true;
                            break;
                        }
                    }
                    if (goodColumn) {
                        for (let row = 0; row <= this.gridHeight; row++) {
                            this.fullGrid[row][col] = this.fullGrid[row][nextCol];
                            this.fullGrid[row][nextCol] = 10;
                        }
                        break;
                    }
                }
            }
        }
    }
    
    userClicked(x, y) {
        if (!this.isMyTurn || this.gameOver) {
            console.log('Click blocked:', { isMyTurn: this.isMyTurn, gameOver: this.gameOver });
            return;
        }
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (x - rect.left) * scaleX;
        const canvasY = (y - rect.top) * scaleY;
        
        const col = Math.floor(canvasX / this.imageWidth);
        const row = Math.floor(canvasY / this.imageHeight);
        
        this.userSelected(col, row);
    }
    
    userSelected(columnSelected, rowSelected) {
        if (columnSelected > (this.gridWidth - 1) || rowSelected > (this.gridHeight - 1)) return;
        if (this.fullGrid[rowSelected][columnSelected] === 10) return;
        
        if (this.selectionGrid[rowSelected][columnSelected] === 10) {
            this.getAttachedCells(columnSelected, rowSelected);
            this.paint();
        } else {
            this.secondClick();
            this.paint();
            this.checkForEndGame();
        }
    }
    
    getAttachedCells(columnSelected, rowSelected) {
        this.theNumberSelected = 0;
        let numberSelectionIncreased = 0;
        let numberSelected = 0;
        
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                this.selectionGrid[row][col] = 10;
            }
        }
        
        const selectedValue = this.fullGrid[rowSelected][columnSelected];
        this.selectionGrid[rowSelected][columnSelected] = selectedValue;
        numberSelected = 1;
        numberSelectionIncreased = 1;
        
        while (numberSelectionIncreased > 0) {
            numberSelectionIncreased = 0;
            for (let col = 0; col <= this.gridWidth; col++) {
                for (let row = 0; row <= this.gridHeight; row++) {
                    if (this.selectionGrid[row][col] === selectedValue) {
                        if (row > 0 && this.fullGrid[row - 1][col] === selectedValue && 
                            this.selectionGrid[row - 1][col] === 10) {
                            this.selectionGrid[row - 1][col] = selectedValue;
                            numberSelectionIncreased++;
                        }
                        if (row < (this.gridHeight - 1) && this.fullGrid[row + 1][col] === selectedValue && 
                            this.selectionGrid[row + 1][col] === 10) {
                            this.selectionGrid[row + 1][col] = selectedValue;
                            numberSelectionIncreased++;
                        }
                        if (col > 0 && this.fullGrid[row][col - 1] === selectedValue && 
                            this.selectionGrid[row][col - 1] === 10) {
                            this.selectionGrid[row][col - 1] = selectedValue;
                            numberSelectionIncreased++;
                        }
                        if (col < (this.gridWidth - 1) && this.fullGrid[row][col + 1] === selectedValue && 
                            this.selectionGrid[row][col + 1] === 10) {
                            this.selectionGrid[row][col + 1] = selectedValue;
                            numberSelectionIncreased++;
                        }
                    }
                }
            }
            numberSelected += numberSelectionIncreased;
        }
        
        if (numberSelected < 2) {
            this.theNumberSelected = 0;
            for (let col = 0; col <= this.gridWidth; col++) {
                for (let row = 0; row <= this.gridHeight; row++) {
                    this.selectionGrid[row][col] = 10;
                }
            }
        } else {
            this.theNumberSelected = numberSelected;
        }
    }
    
    secondClick() {
        let numberRemoved = 0;
        
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                this.undoGrid[row][col] = this.fullGrid[row][col];
                if (this.selectionGrid[row][col] === this.fullGrid[row][col] && 
                    this.selectionGrid[row][col] !== 10) {
                    this.fullGrid[row][col] = 10;
                    numberRemoved++;
                }
            }
        }
        
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                this.selectionGrid[row][col] = 10;
            }
        }
        
        this.theNumberSelected = 0;
        this.blocksFallNow();
        this.bringThemTogether();
        this.updateScore(numberRemoved);
    }
    
    updateScore(numberRemoved) {
        let newTotal = 2;
        let myCount = 2;
        while (myCount <= numberRemoved) {
            newTotal = newTotal + (myCount++ - 3) * 2 + 2;
        }
        this.myScore += newTotal;
        this.theLastValue = newTotal;
    }
    
    checkForEndGame() {
        // Check if there are any valid moves remaining
        let hasMoves = false;
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                if (this.fullGrid[row][col] !== 10) {
                    const value = this.fullGrid[row][col];
                    if (row > 0 && this.fullGrid[row - 1][col] === value) {
                        hasMoves = true;
                        break;
                    }
                    if (row < (this.gridHeight - 1) && this.fullGrid[row + 1][col] === value) {
                        hasMoves = true;
                        break;
                    }
                    if (col > 0 && this.fullGrid[row][col - 1] === value) {
                        hasMoves = true;
                        break;
                    }
                    if (col < (this.gridWidth - 1) && this.fullGrid[row][col + 1] === value) {
                        hasMoves = true;
                        break;
                    }
                }
            }
            if (hasMoves) break;
        }
        
        // Check if player has used all their moves OR can't make any more moves
        const movesRemaining = this.movesPerTurn - this.currentMoveCount - 1;
        const turnComplete = (movesRemaining <= 0) || !hasMoves;
        
        // If turn is complete (no moves left OR used all moves), submit score
        if (turnComplete) {
            this.gameOver = !hasMoves; // Game over only if no moves possible
            this.paint();
            // Submit score and switch to next player (or end game)
            this.submitScore();
        }
        // If moves remain, player can continue their turn (no submission yet)
    }
    
    async submitScore() {
        try {
            // Create a properly sized grid array (only gridHeight x gridWidth, not +1)
            const gridToSend = [];
            for (let row = 0; row < this.gridHeight; row++) {
                gridToSend[row] = [];
                for (let col = 0; col < this.gridWidth; col++) {
                    gridToSend[row][col] = this.fullGrid[row][col];
                }
            }
            
            console.log('Submitting score with grid:', {
                score: this.myScore,
                gridDimensions: `${this.gridHeight}x${this.gridWidth}`,
                gridArraySize: `${gridToSend.length}x${gridToSend[0]?.length}`,
                sampleCell: gridToSend[0]?.[0]
            });
            
            const formData = new URLSearchParams();
            formData.append('game_code', this.gameCode);
            formData.append('session', this.session);
            formData.append('score', this.myScore);
            formData.append('grid', JSON.stringify(gridToSend));
            
            const response = await fetch(`${API_BASE}/submit-score.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('Score submitted successfully:', data);
                this.currentMoveCount = this.movesPerTurn - (data.moves_remaining || 0);
                
                if (data.game_complete) {
                    this.showResults();
                } else if (data.turn_complete) {
                    this.isMyTurn = false;
                    this.gameOver = false; // Reset for next player
                    this.currentMoveCount = 0;
                    this.updateUI();
                    // Show waiting message
                    document.getElementById('waitingModal').style.display = 'block';
                } else {
                    // More moves remaining in this turn
                    this.currentMoveCount++;
                    this.gameOver = false;
                    this.updateUI();
                }
            } else {
                console.error('Failed to submit score:', data.error);
            }
        } catch (error) {
            console.error('Error submitting score:', error);
        }
    }
    
    async startPolling() {
        setInterval(async () => {
            if (this.gameStatus === 'completed') return;
            
            try {
                const response = await fetch(`${API_BASE}/get-game-state.php?game_code=${encodeURIComponent(this.gameCode)}&session=${encodeURIComponent(this.session)}`);
                const data = await response.json();
                
                if (data.success) {
                    const wasMyTurn = this.isMyTurn;
                    this.currentPlayer = parseInt(data.current_player);
                    this.gameStatus = data.game_status;
                    this.playerNumber = parseInt(data.player_number); // Update from server, ensure int
                    this.isMyTurn = (this.currentPlayer === this.playerNumber);
                    this.opponentScore = data.opponent_score;
                    this.movesPerTurn = parseInt(data.moves_per_turn || 1);
                    this.currentMoveCount = parseInt(data.current_move_count || 0);
                    this.numTileTypes = parseInt(data.num_tile_types || 5);
                    const newTileSet = data.tile_set || this.tileSet || 'Letters';
                    
                    // Check if game was restarted (status changed from completed to player1_turn or player2_turn)
                    const wasCompleted = this.gameStatus === 'completed';
                    const isRestarted = wasCompleted && (data.game_status === 'player1_turn' || data.game_status === 'player2_turn');
                    
                    // Check if tile set changed (shouldn't happen, but handle it)
                    if (this.tileSet !== newTileSet) {
                        console.log('Tile set changed in polling:', newTileSet);
                        this.tileSet = newTileSet;
                        this.imagesLoaded = false;
                        this.loadImages().then(() => {
                            this.paint();
                        });
                    }
                    
                    // Grid dimensions shouldn't change after game starts, but just in case
                    const newGridWidth = parseInt(data.grid_width || this.gridWidth);
                    const newGridHeight = parseInt(data.grid_height || this.gridHeight);
                    if (newGridWidth !== this.gridWidth || newGridHeight !== this.gridHeight) {
                        this.gridWidth = newGridWidth;
                        this.gridHeight = newGridHeight;
                        this.setupCanvas();
                        this.initGrids();
                    }
                    
                    // If game was restarted, reload the grid and close results modal
                    if (isRestarted) {
                        console.log('Game restarted - loading new grid');
                        if (data.your_grid && Array.isArray(data.your_grid) && data.your_grid.length > 0) {
                            this.loadGrid(data.your_grid);
                            this.myScore = 0;
                            this.opponentScore = 0;
                            this.gameOver = false;
                            this.currentMoveCount = 0;
                            document.getElementById('resultsModal').style.display = 'none';
                            this.updateUI();
                            this.paint();
                        }
                    }
                    
                    console.log('Polling update:', {
                        playerNumber: this.playerNumber,
                        currentPlayer: this.currentPlayer,
                        isMyTurn: this.isMyTurn,
                        wasMyTurn: wasMyTurn,
                        movesPerTurn: this.movesPerTurn,
                        currentMoveCount: this.currentMoveCount
                    });
                    
                    // Update player names in case they changed
                    if (data.player1_name) this.player1Name = data.player1_name;
                    if (data.player2_name) this.player2Name = data.player2_name;
                    
                    // Check if turn just switched to us - reload grid if it did
                    const turnJustSwitched = !wasMyTurn && this.isMyTurn;
                    
                    if (this.gameStatus === 'completed') {
                        this.showResults();
                    } else if (turnJustSwitched) {
                        // It's now my turn - always reload the grid from server
                        console.log('Turn switched to us, loading updated grid', {
                            hasGrid: !!data.your_grid,
                            gridIsArray: Array.isArray(data.your_grid),
                            gridLength: data.your_grid?.length,
                            gridSample: data.your_grid?.[0]?.[0],
                            expectedDimensions: `${this.gridHeight}x${this.gridWidth}`
                        });
                        if (data.your_grid && Array.isArray(data.your_grid) && data.your_grid.length > 0) {
                            console.log('Loading grid with dimensions:', data.your_grid.length, 'x', data.your_grid[0]?.length);
                            this.loadGrid(data.your_grid);
                            this.paint(); // Force repaint after loading
                        } else {
                            console.warn('Grid data not available in response, but turn switched to us', data);
                        }
                        this.gameOver = false; // Reset game over state for new turn
                        document.getElementById('waitingModal').style.display = 'none';
                        this.updateUI();
                        this.paint();
                    } else if (wasMyTurn && !this.isMyTurn) {
                        // Waiting for opponent
                        document.getElementById('waitingModal').style.display = 'block';
                        this.updateUI();
                    } else if (wasMyTurn === this.isMyTurn && this.isMyTurn) {
                        // Still our turn - update UI but don't reload grid unless it changed
                        document.getElementById('waitingModal').style.display = 'none';
                        this.updateUI();
                        // Optionally reload grid if it's available and different (for debugging)
                        if (data.your_grid && Array.isArray(data.your_grid) && data.your_grid.length > 0) {
                            // Grid should be the same, but we could compare if needed
                        }
                    } else {
                        // Still waiting
                        document.getElementById('waitingModal').style.display = 'block';
                        this.updateUI();
                    }
                }
            } catch (error) {
                console.error('Error polling game state:', error);
            }
        }, 2000);
    }
    
    updateUI() {
        const playerDisplay = document.getElementById('currentPlayerDisplay');
        const scoresDisplay = document.getElementById('scoresDisplay');
        
        if (this.gameStatus === 'completed') {
            playerDisplay.textContent = 'Game Complete!';
        } else if (this.isMyTurn) {
            const movesRemaining = this.movesPerTurn - this.currentMoveCount;
            if (movesRemaining > 1) {
                playerDisplay.textContent = `Your Turn - ${this.playerName} (${movesRemaining} moves left)`;
            } else {
                playerDisplay.textContent = `Your Turn - ${this.playerName} (last move)`;
            }
            playerDisplay.style.color = '#4CAF50';
        } else {
            playerDisplay.textContent = `Waiting for ${this.playerNumber === 1 ? this.player2Name : this.player1Name}...`;
            playerDisplay.style.color = '#ff9800';
        }
        
        scoresDisplay.innerHTML = `
            <div><strong>${this.player1Name}:</strong> ${this.playerNumber === 1 ? this.myScore : this.opponentScore}</div>
            <div><strong>${this.player2Name}:</strong> ${this.playerNumber === 2 ? this.myScore : this.opponentScore}</div>
        `;
    }
    
    showResults() {
        const winner = this.myScore > this.opponentScore ? this.playerName : 
                      (this.opponentScore > this.myScore ? 
                       (this.playerNumber === 1 ? this.player2Name : this.player1Name) : null);
        
        const resultsContent = document.getElementById('resultsContent');
        resultsContent.innerHTML = `
            <div style="margin: 20px 0;">
                <div style="font-size: 24px; margin-bottom: 20px;">
                    ${winner ? `<strong>${winner} Wins!</strong>` : 'It\'s a Tie!'}
                </div>
                <div style="font-size: 18px;">
                    <div>${this.player1Name}: ${this.playerNumber === 1 ? this.myScore : this.opponentScore} points</div>
                    <div>${this.player2Name}: ${this.playerNumber === 2 ? this.myScore : this.opponentScore} points</div>
                </div>
            </div>
        `;
        
        document.getElementById('resultsModal').style.display = 'block';
    }
    
    async restartGame() {
        const btn = document.getElementById('playAgainBtn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Restarting...';
        
        try {
            const formData = new URLSearchParams();
            formData.append('game_code', this.gameCode);
            formData.append('session', this.session);
            
            const response = await fetch(`${API_BASE}/restart-game.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Close results modal
                document.getElementById('resultsModal').style.display = 'none';
                
                // Reset game state
                this.myScore = 0;
                this.opponentScore = 0;
                this.gameOver = false;
                this.currentMoveCount = 0;
                
                // Reload game state to get the new grid
                await this.loadGameState();
                
                // Update UI
                this.updateUI();
                this.paint();
            } else {
                alert('Failed to restart game: ' + (data.error || 'Unknown error'));
                btn.disabled = false;
                btn.textContent = originalText;
            }
        } catch (error) {
            console.error('Error restarting game:', error);
            alert('Error restarting game. Please try again.');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
    
    paint() {
        if (!this.imagesLoaded) {
            console.log('Images not loaded yet');
            return;
        }
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Initialize numberHit array based on numTileTypes
        const numberHit = new Array(this.numTileTypes).fill(0);
        let emptyCount = 0;
        let drawnCount = 0;
        
        // Tile type names (A-F for up to 6 types)
        const tileNames = ['A', 'B', 'C', 'D', 'E', 'F'];
        
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                const value = this.fullGrid[row][col];
                
                if (value >= 0 && value < this.numTileTypes) {
                    numberHit[value]++;
                } else if (value === 10) {
                    emptyCount++;
                }
                
                const x = this.imageHeight * col;
                const y = this.imageWidth * row;
                const selected = this.selectionGrid[row][col];
                
                if (selected !== 10 && selected === value && value < this.numTileTypes) {
                    const tileName = tileNames[value];
                    const selectedImg = this.images[tileName + 's'];
                    if (selectedImg) {
                        this.ctx.drawImage(selectedImg, x, y, this.imageWidth, this.imageHeight);
                        drawnCount++;
                    } else {
                        console.warn(`Selected image missing for value ${value} (${tileName}s)`);
                    }
                } else if (value >= 0 && value < this.numTileTypes) {
                    const tileName = tileNames[value];
                    const normalImg = this.images[tileName];
                    if (normalImg) {
                        this.ctx.drawImage(normalImg, x, y, this.imageWidth, this.imageHeight);
                        drawnCount++;
                    } else {
                        console.warn(`Image missing for value ${value} (${tileName})`);
                    }
                }
            }
        }
        
        // Debug info (first paint only)
        if (!this._paintDebugged) {
            const tileNames = ['A', 'B', 'C', 'D', 'E', 'F'];
            const tileCountsObj = {};
            for (let i = 0; i < this.numTileTypes; i++) {
                tileCountsObj[tileNames[i]] = numberHit[i];
            }
            console.log('Paint debug:', {
                totalCells: (this.gridWidth + 1) * (this.gridHeight + 1),
                emptyCells: emptyCount,
                drawnTiles: drawnCount,
                numTileTypes: this.numTileTypes,
                tileCounts: tileCountsObj,
                imagesLoaded: Object.keys(this.images).length
            });
            this._paintDebugged = true;
        }
        
        const infoText = document.getElementById('infoText');
        if (this.theNumberSelected === 0) {
            if (!this.gameOver) {
                infoText.value = `Score: ${this.myScore} points`;
            } else {
                infoText.value = `Final Score: ${this.myScore} points`;
            }
        } else {
            let newTotal = 2;
            let myCount = 2;
            while (myCount <= this.theNumberSelected) {
                newTotal = newTotal + (myCount++ - 3) * 2 + 2;
            }
            infoText.value = `Score: ${this.myScore} points (${this.theNumberSelected} selected for ${newTotal} points)`;
        }
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            if (this.isMyTurn && !this.gameOver) {
                this.userClicked(e.clientX, e.clientY);
            }
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('backToLobbyBtn').addEventListener('click', () => {
            window.location.href = 'lobby.html';
        });
    }
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    new SameGameMultiplayer();
});

