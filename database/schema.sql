-- SameGame Database Schema
CREATE DATABASE IF NOT EXISTS samegame CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE samegame;

-- SameGame games table
CREATE TABLE IF NOT EXISTS samegame_games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_code VARCHAR(6) UNIQUE NOT NULL,
    host_session VARCHAR(64) NOT NULL,
    player2_session VARCHAR(64) NULL,
    player1_name VARCHAR(50) DEFAULT 'Player 1',
    player2_name VARCHAR(50) DEFAULT 'Player 2',
    player1_dice_roll INT NULL,
    player2_dice_roll INT NULL,
    player1_score INT DEFAULT 0,
    player2_score INT DEFAULT 0,
    current_player INT DEFAULT 1,
    moves_per_turn INT DEFAULT 1,
    current_move_count INT DEFAULT 0,
    num_tile_types INT DEFAULT 5,
    grid_width INT DEFAULT 40,
    grid_height INT DEFAULT 20,
    tile_set VARCHAR(20) DEFAULT 'Letters',
    game_status ENUM('waiting', 'player1_turn', 'player2_turn', 'completed') DEFAULT 'waiting',
    player1_grid JSON NULL,
    player2_grid JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_game_code (game_code),
    INDEX idx_host_session (host_session),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

