-- Add game options for tile type multipliers, timer, and auto-select
ALTER TABLE samegame_games 
ADD COLUMN tile_type_multiplier_enabled BOOLEAN DEFAULT FALSE AFTER tile_set,
ADD COLUMN timer_enabled BOOLEAN DEFAULT FALSE AFTER tile_type_multiplier_enabled,
ADD COLUMN timer_seconds INT DEFAULT 60 AFTER timer_enabled,
ADD COLUMN auto_select_enabled BOOLEAN DEFAULT FALSE AFTER timer_seconds,
ADD INDEX idx_timer_enabled (timer_enabled);
