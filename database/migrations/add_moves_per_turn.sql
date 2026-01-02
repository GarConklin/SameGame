-- Migration to add moves_per_turn and current_move_count columns
ALTER TABLE samegame_games 
ADD COLUMN moves_per_turn INT DEFAULT 1 AFTER current_player,
ADD COLUMN current_move_count INT DEFAULT 0 AFTER moves_per_turn;

