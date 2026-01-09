#!/bin/bash
# Quick script to check if database schema is up to date
# Usage: ./check-schema.sh [mysql_options]

DB_NAME="samegame"
MYSQL_OPTS="${@}"

echo "Checking database schema for $DB_NAME..."
echo "=========================================="
echo ""

mysql $MYSQL_OPTS $DB_NAME <<EOF
-- Check for all new columns
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = '$DB_NAME' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'tile_type_multiplier_enabled') 
        THEN '✓ tile_type_multiplier_enabled'
        ELSE '✗ tile_type_multiplier_enabled MISSING'
    END AS 'Tile Multipliers',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = '$DB_NAME' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'timer_enabled') 
        THEN '✓ timer_enabled'
        ELSE '✗ timer_enabled MISSING'
    END AS 'Timer Enabled',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = '$DB_NAME' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'timer_seconds') 
        THEN '✓ timer_seconds'
        ELSE '✗ timer_seconds MISSING'
    END AS 'Timer Seconds',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = '$DB_NAME' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'timer_mode') 
        THEN '✓ timer_mode'
        ELSE '✗ timer_mode MISSING'
    END AS 'Timer Mode',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = '$DB_NAME' 
                    AND TABLE_NAME = 'samegame_games' 
                    AND COLUMN_NAME = 'auto_select_enabled') 
        THEN '✓ auto_select_enabled'
        ELSE '✗ auto_select_enabled MISSING'
    END AS 'Auto Select';
EOF

echo ""
echo "=========================================="
echo "If any columns show ✗ MISSING, run the migrations:"
echo "  mysql $MYSQL_OPTS $DB_NAME < database/migrations/add_game_options.sql"
echo "  mysql $MYSQL_OPTS $DB_NAME < database/migrations/add_timer_mode.sql"
