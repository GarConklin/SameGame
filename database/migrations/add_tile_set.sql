-- Migration to add tile_set column
ALTER TABLE samegame_games 
ADD COLUMN tile_set VARCHAR(20) DEFAULT 'Letters' AFTER grid_height;

