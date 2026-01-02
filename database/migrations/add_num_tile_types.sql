-- Migration to add num_tile_types column
ALTER TABLE samegame_games 
ADD COLUMN num_tile_types INT DEFAULT 5 AFTER current_move_count;

