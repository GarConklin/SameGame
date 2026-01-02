-- Simple migration to add all new columns
-- Run this if your database is missing moves_per_turn, current_move_count, or num_tile_types
-- If a column already exists, you'll get an error but you can ignore it

USE samegame;

-- Add moves_per_turn column
ALTER TABLE samegame_games 
ADD COLUMN moves_per_turn INT DEFAULT 1 AFTER current_player;

-- Add current_move_count column
ALTER TABLE samegame_games 
ADD COLUMN current_move_count INT DEFAULT 0 AFTER moves_per_turn;

-- Add num_tile_types column
ALTER TABLE samegame_games 
ADD COLUMN num_tile_types INT DEFAULT 5 AFTER current_move_count;

