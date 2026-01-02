-- Migration to add grid_width and grid_height columns
ALTER TABLE samegame_games 
ADD COLUMN grid_width INT DEFAULT 40 AFTER num_tile_types,
ADD COLUMN grid_height INT DEFAULT 20 AFTER grid_width;

