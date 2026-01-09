<?php
/**
 * Grid Generator for SameGame
 * Generates a random grid for the game
 */

class GridGenerator {
    private $gridHeight = 20;
    private $gridWidth = 40;
    private $numTileTypes = 4;
    
    public function __construct($numTileTypes = 4, $gridWidth = 40, $gridHeight = 20) {
        $this->numTileTypes = max(2, min(6, (int)$numTileTypes));
        $this->gridWidth = max(20, min(60, (int)$gridWidth));
        $this->gridHeight = max(10, min(30, (int)$gridHeight));
    }
    
    public function generateGrid() {
        $grid = [];
        
        // Initialize grid with empty cells (10 = empty)
        for ($row = 0; $row <= $this->gridHeight; $row++) {
            $grid[$row] = [];
            for ($col = 0; $col <= $this->gridWidth; $col++) {
                $grid[$row][$col] = 10;
            }
        }
        
        // Randomly fill grid (matching JavaScript logic exactly)
        $numberLeft = $this->gridWidth * $this->gridHeight;
        
        // First pass: randomly fill until we have about 100 empty cells left
        while ($numberLeft > 100) {
            $col = rand(0, $this->gridWidth - 1);
            $row = rand(0, $this->gridHeight - 1);
            
            if ($grid[$row][$col] === 10) {
                $grid[$row][$col] = rand(0, $this->numTileTypes - 1);
                $numberLeft--;
            }
        }
        
        // Second pass: fill all remaining empty cells systematically
        for ($col = 0; $col < $this->gridWidth; $col++) {
            for ($row = 0; $row < $this->gridHeight; $row++) {
                if ($grid[$row][$col] === 10) {
                    $grid[$row][$col] = rand(0, $this->numTileTypes - 1);
                }
            }
        }
        
        // Verify grid is fully filled (for debugging)
        $emptyCount = 0;
        for ($col = 0; $col < $this->gridWidth; $col++) {
            for ($row = 0; $row < $this->gridHeight; $row++) {
                if ($grid[$row][$col] === 10) {
                    $emptyCount++;
                }
            }
        }
        
        // If there are still empty cells, fill them
        if ($emptyCount > 0) {
            for ($col = 0; $col < $this->gridWidth; $col++) {
                for ($row = 0; $row < $this->gridHeight; $row++) {
                    if ($grid[$row][$col] === 10) {
                        $grid[$row][$col] = rand(0, $this->numTileTypes - 1);
                    }
                }
            }
        }
        
        return $grid;
    }
}

