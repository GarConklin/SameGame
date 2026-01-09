-- Add timer_mode column for per move vs per turn timer option
ALTER TABLE samegame_games 
ADD COLUMN timer_mode ENUM('per_move', 'per_turn') DEFAULT 'per_move' AFTER timer_seconds;
