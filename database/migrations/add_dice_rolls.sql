-- Add dice roll columns for determining starting player
ALTER TABLE samegame_games 
ADD COLUMN player1_dice_roll INT NULL AFTER player2_name,
ADD COLUMN player2_dice_roll INT NULL AFTER player1_dice_roll;
