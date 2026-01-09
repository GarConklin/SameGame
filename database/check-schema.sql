-- Check if database schema is up to date
-- This will show all columns in the samegame_games table and their details

USE samegame;

-- Show all columns in samegame_games table
SHOW COLUMNS FROM samegame_games;

-- Check for specific new columns
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = 'samegame' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'tile_type_multiplier_enabled') 
        THEN '✓ tile_type_multiplier_enabled exists'
        ELSE '✗ tile_type_multiplier_enabled MISSING'
    END AS check_tile_multiplier,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = 'samegame' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'timer_enabled') 
        THEN '✓ timer_enabled exists'
        ELSE '✗ timer_enabled MISSING'
    END AS check_timer_enabled,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = 'samegame' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'timer_seconds') 
        THEN '✓ timer_seconds exists'
        ELSE '✗ timer_seconds MISSING'
    END AS check_timer_seconds,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = 'samegame' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'timer_mode') 
        THEN '✓ timer_mode exists'
        ELSE '✗ timer_mode MISSING'
    END AS check_timer_mode,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = 'samegame' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'auto_select_enabled') 
        THEN '✓ auto_select_enabled exists'
        ELSE '✗ auto_select_enabled MISSING'
    END AS check_auto_select;
