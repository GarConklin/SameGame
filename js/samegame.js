// SameGame HTML5 - Converted from Java Applet
// Written by Paul Butler

class SameGame {
    constructor() {
        // Game configuration (can be changed via UI)
        // Load saved settings from localStorage, or use defaults
        this.gridWidth = parseInt(localStorage.getItem('samegame_grid_width')) || 40;
        this.gridHeight = parseInt(localStorage.getItem('samegame_grid_height')) || 20;
        this.numTileTypes = parseInt(localStorage.getItem('samegame_tile_types')) || 5;
        this.tileSet = localStorage.getItem('samegame_tile_set') || 'Letters';
        this.imageWidth = 20;
        this.imageHeight = 20;
        
        // Game state
        this.myScore = 0;
        this.theNumberSelected = 0;
        this.theLastValue = 0;
        this.gameOver = false;
        this.showingHighScore = false;
        this.setUserName = false;
        
        // Grids
        this.fullGrid = [];
        this.undoGrid = [];
        this.redoGrid = [];
        this.selectionGrid = [];
        
        // High scores
        this.highScoresValuesTable = new Array(10).fill(0);
        this.highScoresNamesTable = new Array(10).fill('');
        
        // Images
        this.images = {};
        this.imagesLoaded = false;
        this.userName = localStorage.getItem('samegame_username') || 'Player';
        
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Initialize grids
        this.initGrids();
        
        // Load tile sets and populate dropdown, then load images and start game
        populateTileSetSelect(document.getElementById('tileSetSelect'), this.tileSet).then(() => {
            // Set input field values from loaded settings
            document.getElementById('gridWidthInput').value = this.gridWidth;
            document.getElementById('gridHeightInput').value = this.gridHeight;
            document.getElementById('tileTypesInput').value = this.numTileTypes;
            document.getElementById('tileSetSelect').value = this.tileSet;
            
            // Load images and start game
            this.loadImages().then(() => {
                this.newGame();
                this.getHighScores();
                this.setupEventListeners();
            });
        });
    }
    
    setupCanvas() {
        // Set canvas size
        this.canvas.width = this.imageWidth * this.gridWidth;
        this.canvas.height = this.imageHeight * this.gridHeight;
        
        // Scale canvas for better visibility (optional)
        const scale = Math.min(window.innerWidth / this.canvas.width, 
                              (window.innerHeight - 150) / this.canvas.height, 2);
        this.canvas.style.width = (this.canvas.width * scale) + 'px';
        this.canvas.style.height = (this.canvas.height * scale) + 'px';
    }
    
    initGrids() {
        // Reinitialize grid arrays with new dimensions
        this.fullGrid = [];
        this.undoGrid = [];
        this.redoGrid = [];
        this.selectionGrid = [];
        for (let row = 0; row <= this.gridHeight; row++) {
            this.fullGrid[row] = [];
            this.undoGrid[row] = [];
            this.redoGrid[row] = [];
            this.selectionGrid[row] = [];
            for (let col = 0; col <= this.gridWidth; col++) {
                this.fullGrid[row][col] = 10; // 10 = empty
                this.undoGrid[row][col] = 10;
                this.redoGrid[row][col] = 10;
                this.selectionGrid[row][col] = 10;
            }
        }
    }
    
    applySettings() {
        const newWidth = parseInt(document.getElementById('gridWidthInput').value) || 40;
        const newHeight = parseInt(document.getElementById('gridHeightInput').value) || 20;
        const newTileTypes = parseInt(document.getElementById('tileTypesInput').value) || 5;
        const newTileSet = document.getElementById('tileSetSelect').value || 'Letters';
        const newUsername = document.getElementById('usernameInput').value.trim();
        
        // Validate ranges
        const width = Math.max(20, Math.min(60, newWidth));
        const height = Math.max(10, Math.min(30, newHeight));
        const tileTypes = Math.max(2, Math.min(6, newTileTypes));
        // Validate tile set - accept any value (validation happens server-side for multiplayer)
        const tileSet = newTileSet || 'Letters';
        
        // Save username if provided
        if (newUsername) {
            this.userName = newUsername;
            localStorage.setItem('samegame_username', newUsername);
        }
        
        // Check if tile set changed - need to reload images
        const tileSetChanged = this.tileSet !== tileSet;
        
        // Update values
        this.gridWidth = width;
        this.gridHeight = height;
        this.numTileTypes = tileTypes;
        this.tileSet = tileSet;
        
        // Save settings to localStorage for use in multiplayer
        localStorage.setItem('samegame_grid_width', width.toString());
        localStorage.setItem('samegame_grid_height', height.toString());
        localStorage.setItem('samegame_tile_types', tileTypes.toString());
        localStorage.setItem('samegame_tile_set', tileSet);
        
        // Update input fields to show actual values (in case they were out of range)
        document.getElementById('gridWidthInput').value = width;
        document.getElementById('gridHeightInput').value = height;
        document.getElementById('tileTypesInput').value = tileTypes;
        document.getElementById('tileSetSelect').value = tileSet;
        
        // Close setup modal
        document.getElementById('setupModal').style.display = 'none';
        
        // Reinitialize grids and canvas
        this.setupCanvas();
        this.initGrids();
        
        // Reload images if tile set changed
        if (tileSetChanged) {
            this.imagesLoaded = false;
            this.loadImages().then(() => {
                this.newGame();
            });
        } else {
            // Start new game with new settings
            this.newGame();
        }
        
        // Info text will be updated by paint/updateUI if needed
    }
    
    async loadImages() {
        // Load all possible tile images (A-F and selected versions As-Fs)
        // Add cache-busting timestamp to force reload of updated images
        const cacheBuster = '?v=' + Date.now();
        const imageNames = ['A', 'B', 'C', 'D', 'E', 'F', 'As', 'Bs', 'Cs', 'Ds', 'Es', 'Fs'];
        const imagePath = `images/${this.tileSet}/`;
        const loadPromises = imageNames.map(name => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = `${imagePath}${name}.gif${cacheBuster}`;
                img.onload = () => {
                    this.images[name] = img;
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${imagePath}${name}.gif`);
                    resolve(); // Continue even if image fails
                };
            });
        });
        
        await Promise.all(loadPromises);
        this.imagesLoaded = true;
        console.log(`Loaded tile set: ${this.tileSet}`);
    }
    
    newGame() {
        // Reset game state completely
        this.myScore = 0;
        this.theNumberSelected = 0;
        this.theLastValue = 0;
        this.gameOver = false;
        
        // Generate new grid
        this.setupGridRandom();
        this.blocksFallNow();
        this.bringThemTogether();
        this.paint();
    }
    
    setupGridRandom() {
        // Note: myScore, theNumberSelected, and gameOver are reset in newGame()
        // This function just sets up the grid
        
        // Clear grids
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                this.fullGrid[row][col] = 10;
                this.selectionGrid[row][col] = 10;
            }
        }
        
        // Randomly fill grid
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
        
        // Fill remaining cells
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
        if (columnSelected > (this.gridWidth - 1) || rowSelected > (this.gridHeight - 1)) {
            return;
        }
        
        if (this.fullGrid[rowSelected][columnSelected] === 10) {
            // Empty cell
            return;
        }
        
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
        
        // Clear all selections
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                this.selectionGrid[row][col] = 10;
            }
        }
        
        const selectedValue = this.fullGrid[rowSelected][columnSelected];
        this.selectionGrid[rowSelected][columnSelected] = selectedValue;
        numberSelected = 1;
        numberSelectionIncreased = 1;
        
        // Flood fill algorithm
        while (numberSelectionIncreased > 0) {
            numberSelectionIncreased = 0;
            
            for (let col = 0; col <= this.gridWidth; col++) {
                for (let row = 0; row <= this.gridHeight; row++) {
                    if (this.selectionGrid[row][col] === selectedValue) {
                        // Check above
                        if (row > 0 && this.fullGrid[row - 1][col] === selectedValue && 
                            this.selectionGrid[row - 1][col] === 10) {
                            this.selectionGrid[row - 1][col] = selectedValue;
                            numberSelectionIncreased++;
                        }
                        // Check below
                        if (row < (this.gridHeight - 1) && this.fullGrid[row + 1][col] === selectedValue && 
                            this.selectionGrid[row + 1][col] === 10) {
                            this.selectionGrid[row + 1][col] = selectedValue;
                            numberSelectionIncreased++;
                        }
                        // Check left
                        if (col > 0 && this.fullGrid[row][col - 1] === selectedValue && 
                            this.selectionGrid[row][col - 1] === 10) {
                            this.selectionGrid[row][col - 1] = selectedValue;
                            numberSelectionIncreased++;
                        }
                        // Check right
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
            // Clear selection
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
        
        // Save to undo grid
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
        
        // Clear selection
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
    
    undoMove() {
        if (this.gameOver) return;
        
        if (this.theLastValue > 0) {
            for (let col = 0; col <= this.gridWidth; col++) {
                for (let row = 0; row <= this.gridHeight; row++) {
                    this.fullGrid[row][col] = this.undoGrid[row][col];
                    this.selectionGrid[row][col] = 10;
                }
            }
            this.theNumberSelected = 0;
            this.myScore -= this.theLastValue;
            this.theLastValue = 0;
            this.paint();
        }
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
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                if (this.fullGrid[row][col] !== 10) {
                    const value = this.fullGrid[row][col];
                    // Check above
                    if (row > 0 && this.fullGrid[row - 1][col] === value) return;
                    // Check below
                    if (row < (this.gridHeight - 1) && this.fullGrid[row + 1][col] === value) return;
                    // Check left
                    if (col > 0 && this.fullGrid[row][col - 1] === value) return;
                    // Check right
                    if (col < (this.gridWidth - 1) && this.fullGrid[row][col + 1] === value) return;
                }
            }
        }
        
        this.gameOver = true;
        this.paint();
        this.saveHighScore();
    }
    
    replayGame() {
        for (let col = 0; col < this.gridWidth; col++) {
            for (let row = 0; row < this.gridHeight; row++) {
                this.fullGrid[row][col] = this.redoGrid[row][col];
                this.selectionGrid[row][col] = 10;
            }
        }
        this.gameOver = false;
        this.theNumberSelected = 0;
        this.theLastValue = 0;
        this.myScore = 0;
        this.paint();
    }
    
    paint() {
        if (!this.imagesLoaded) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.showingHighScore) {
            this.displayHighScores();
            return;
        }
        
        if (this.setUserName) {
            return;
        }
        
        // Count blocks (initialize based on numTileTypes)
        const numberHit = new Array(this.numTileTypes).fill(0);
        const tileNames = ['A', 'B', 'C', 'D', 'E', 'F'];
        
        // Draw grid
        for (let col = 0; col <= this.gridWidth; col++) {
            for (let row = 0; row <= this.gridHeight; row++) {
                const value = this.fullGrid[row][col];
                if (value >= 0 && value < this.numTileTypes) {
                    numberHit[value]++;
                }
                
                const x = this.imageHeight * col;
                const y = this.imageWidth * row;
                const selected = this.selectionGrid[row][col];
                
                // Draw selected or normal image
                if (selected !== 10 && selected === value && value < this.numTileTypes) {
                    // Draw selected version
                    const tileName = tileNames[value];
                    const selectedImg = this.images[tileName + 's'];
                    if (selectedImg) {
                        this.ctx.drawImage(selectedImg, x, y, this.imageWidth, this.imageHeight);
                    }
                } else if (value >= 0 && value < this.numTileTypes) {
                    // Draw normal version
                    const tileName = tileNames[value];
                    const normalImg = this.images[tileName];
                    if (normalImg) {
                        this.ctx.drawImage(normalImg, x, y, this.imageWidth, this.imageHeight);
                    }
                }
            }
        }
        
        // Update info text
        const infoText = document.getElementById('infoText');
        if (this.theNumberSelected === 0) {
            if (!this.gameOver) {
                if (this.myScore > 0) {
                    infoText.value = `Score: ${this.myScore} points`;
                } else {
                    if (this.userName.startsWith('Bee') || this.userName.startsWith('Bethany') || 
                        this.userName.startsWith('Paul J Butler')) {
                        let counts = [];
                        for (let i = 0; i < this.numTileTypes; i++) {
                            counts.push(`${tileNames[i]}:${numberHit[i]}`);
                        }
                        infoText.value = counts.join(' ');
                    } else {
                        infoText.value = `Score: ${this.myScore} points`;
                    }
                }
            } else {
                infoText.value = `That's it! Your final Score is ${this.myScore} points.`;
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
    
    displayHighScores() {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '12px Arial';
        let y = 18;
        for (let i = 0; i < 10; i++) {
            if (this.highScoresNamesTable[i]) {
                const name = this.highScoresNamesTable[i].trim();
                this.ctx.fillText(`${name} ${this.highScoresValuesTable[i]}`, 10, y);
                y += 12;
            }
        }
    }
    
    getHighScores() {
        try {
            const saved = localStorage.getItem('samegame_highscores');
            if (saved) {
                const data = JSON.parse(saved);
                this.highScoresValuesTable = data.scores || new Array(10).fill(0);
                this.highScoresNamesTable = data.names || new Array(10).fill('');
            }
        } catch (e) {
            console.error('Error loading high scores:', e);
        }
    }
    
    saveHighScore() {
        this.getHighScores();
        
        let loopPosition = 0;
        while (loopPosition < 10 && this.highScoresValuesTable[loopPosition] >= this.myScore) {
            loopPosition++;
        }
        
        if (loopPosition < 10 && this.myScore > this.highScoresValuesTable[loopPosition]) {
            // Insert new high score
            const newName = this.userName.substring(0, 50);
            
            // Shift scores down
            for (let i = 9; i > loopPosition; i--) {
                this.highScoresValuesTable[i] = this.highScoresValuesTable[i - 1];
                this.highScoresNamesTable[i] = this.highScoresNamesTable[i - 1];
            }
            
            this.highScoresValuesTable[loopPosition] = this.myScore;
            this.highScoresNamesTable[loopPosition] = newName;
            
            // Save to localStorage
            try {
                localStorage.setItem('samegame_highscores', JSON.stringify({
                    scores: this.highScoresValuesTable,
                    names: this.highScoresNamesTable
                }));
            } catch (e) {
                console.error('Error saving high scores:', e);
            }
        }
    }
    
    showHighScoreModal() {
        this.getHighScores();
        const modal = document.getElementById('highScoreModal');
        const list = document.getElementById('highScoreList');
        list.innerHTML = '<ol>';
        for (let i = 0; i < 10; i++) {
            if (this.highScoresNamesTable[i] || this.highScoresValuesTable[i] > 0) {
                const name = (this.highScoresNamesTable[i] || '').trim();
                list.innerHTML += `<li>${name}: ${this.highScoresValuesTable[i]}</li>`;
            }
        }
        list.innerHTML += '</ol>';
        modal.style.display = 'block';
    }
    
    async showSetupModal() {
        const modal = document.getElementById('setupModal');
        const usernameInput = document.getElementById('usernameInput');
        const tileSetSelect = document.getElementById('tileSetSelect');
        
        usernameInput.value = this.userName;
        
        // Populate tile set select if not already populated
        if (tileSetSelect.options.length === 0 && typeof populateTileSetSelect === 'function') {
            await populateTileSetSelect(tileSetSelect, this.tileSet);
        }
        
        // Set input field values from current settings
        document.getElementById('gridWidthInput').value = this.gridWidth;
        document.getElementById('gridHeightInput').value = this.gridHeight;
        document.getElementById('tileTypesInput').value = this.numTileTypes;
        tileSetSelect.value = this.tileSet;
        
        // Update tile preview with current tile set
        if (typeof updateTilePreview === 'function') {
            updateTilePreview(this.tileSet);
        }
        
        modal.style.display = 'block';
        usernameInput.focus();
    }
    
    setupEventListeners() {
        // Canvas click
        this.canvas.addEventListener('click', (e) => {
            if (!this.showingHighScore && !this.setUserName && !this.gameOver) {
                this.userClicked(e.clientX, e.clientY);
            }
        });
        
        // Settings button
        document.getElementById('applySettingsBtn').addEventListener('click', () => {
            this.applySettings();
        });
        
        // Update tile preview and game board when tile set changes in setup modal
        document.getElementById('tileSetSelect').addEventListener('change', async (e) => {
            const newTileSet = e.target.value;
            
            // Update tile preview
            if (typeof updateTilePreview === 'function') {
                updateTilePreview(newTileSet);
            }
            
            // Update game board immediately with new tile set
            const oldTileSet = this.tileSet;
            this.tileSet = newTileSet;
            
            // Reload images for new tile set
            this.imagesLoaded = false;
            await this.loadImages();
            
            // Reload the current grid with new tile images
            this.paint();
        });
        
        // Buttons
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.newGame();
        });
        
        document.getElementById('replayBtn').addEventListener('click', () => {
            this.replayGame();
        });
        
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undoMove();
        });
        
        document.getElementById('highScoreBtn').addEventListener('click', () => {
            if (this.showingHighScore) {
                this.showingHighScore = false;
                this.paint();
                document.getElementById('highScoreBtn').textContent = 'High Scores';
            } else {
                this.showingHighScore = true;
                this.displayHighScores();
                this.paint();
                document.getElementById('highScoreBtn').textContent = 'Back to Game';
            }
        });
        
        document.getElementById('setupBtn').addEventListener('click', () => {
            this.showSetupModal();
        });
        
        document.getElementById('cancelSetupBtn').addEventListener('click', () => {
            document.getElementById('setupModal').style.display = 'none';
        });
        
        document.getElementById('twoPlayerBtn').addEventListener('click', () => {
            window.location.href = 'lobby.html';
        });
        
        // High score modal
        document.getElementById('closeHighScoreBtn').addEventListener('click', () => {
            document.getElementById('highScoreModal').style.display = 'none';
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            const highScoreModal = document.getElementById('highScoreModal');
            const setupModal = document.getElementById('setupModal');
            if (e.target === highScoreModal) {
                highScoreModal.style.display = 'none';
            }
            if (e.target === setupModal) {
                setupModal.style.display = 'none';
            }
        });
    }
}

// Function to update tile preview (shared with lobby.js functionality)
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

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    new SameGame();
});

