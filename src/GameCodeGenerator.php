<?php
/**
 * Simple Game Code Generator for SameGame
 * Generates 4-character codes (letters and numbers)
 */

class GameCodeGenerator {
    private $conn;
    
    public function __construct($conn) {
        $this->conn = $conn;
    }
    
    /**
     * Generate a unique 4-character game code
     */
    public function generateUniqueCode() {
        $maxAttempts = 50;
        $attempts = 0;
        
        while ($attempts < $maxAttempts) {
            $code = $this->generateCode();
            
            if (!$this->codeExists($code)) {
                return $code;
            }
            
            $attempts++;
        }
        
        throw new Exception("Failed to generate unique game code after {$maxAttempts} attempts");
    }
    
    /**
     * Generate a random 4-character code
     * Uses uppercase letters and numbers, excluding confusing characters (0, O, I, 1)
     */
    private function generateCode() {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = '';
        for ($i = 0; $i < 4; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $code;
    }
    
    /**
     * Check if code already exists in database
     */
    private function codeExists($code) {
        $stmt = $this->conn->prepare("SELECT id FROM samegame_games WHERE game_code = ? AND expires_at > NOW()");
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->num_rows > 0;
        $stmt->close();
        return $exists;
    }
}

