<?php
/**
 * Game Validator for SameGame
 * Checks if there are valid moves remaining on the board
 */

class GameValidator {
    /**
     * Check if there are any valid moves remaining on the grid
     * A valid move is when two adjacent tiles have the same value
     */
    public static function hasValidMoves($grid) {
        if (!is_array($grid) || empty($grid)) {
            return false;
        }
        
        $height = count($grid);
        if ($height === 0) return false;
        
        $width = count($grid[0] ?? []);
        if ($width === 0) return false;
        
        // Check each cell for adjacent matches
        for ($row = 0; $row < $height; $row++) {
            for ($col = 0; $col < $width; $col++) {
                $value = $grid[$row][$col] ?? null;
                
                // Skip empty cells (value 10 or null)
                if ($value === null || $value === 10) {
                    continue;
                }
                
                // Check adjacent cells for matches
                // Check above
                if ($row > 0 && isset($grid[$row - 1][$col]) && $grid[$row - 1][$col] === $value && $grid[$row - 1][$col] !== 10) {
                    return true;
                }
                
                // Check below
                if ($row < ($height - 1) && isset($grid[$row + 1][$col]) && $grid[$row + 1][$col] === $value && $grid[$row + 1][$col] !== 10) {
                    return true;
                }
                
                // Check left
                if ($col > 0 && isset($grid[$row][$col - 1]) && $grid[$row][$col - 1] === $value && $grid[$row][$col - 1] !== 10) {
                    return true;
                }
                
                // Check right
                if ($col < ($width - 1) && isset($grid[$row][$col + 1]) && $grid[$row][$col + 1] === $value && $grid[$row][$col + 1] !== 10) {
                    return true;
                }
            }
        }
        
        return false;
    }
}

