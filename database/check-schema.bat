@echo off
REM Quick script to check if database schema is up to date on Windows
REM This script uses Docker to connect to the database
REM Make sure Docker is running and the samegame_db container is running

set DB_CONTAINER=samegame_db
set DB_USER=root
set DB_PASS=rootpass
set DB_NAME=samegame

REM Check if Docker is available
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not found in PATH. Please make sure Docker is installed and running.
    pause
    exit /b 1
)

REM Check if container is running
docker ps --filter "name=%DB_CONTAINER%" --format "{{.Names}}" | findstr /C:"%DB_CONTAINER%" >nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Container '%DB_CONTAINER%' is not running.
    echo Please start it with: docker compose up -d
    pause
    exit /b 1
)

echo Checking database schema for %DB_NAME%...
echo Using Docker container: %DB_CONTAINER%
echo ==========================================
echo.

docker exec %DB_CONTAINER% mysql -u%DB_USER% -p%DB_PASS% %DB_NAME% -e "SELECT CASE WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'samegame' AND TABLE_NAME = 'samegame_games' AND COLUMN_NAME = 'tile_type_multiplier_enabled') THEN 'YES' ELSE 'NO' END AS 'tile_type_multiplier_enabled', CASE WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'samegame' AND TABLE_NAME = 'samegame_games' AND COLUMN_NAME = 'timer_enabled') THEN 'YES' ELSE 'NO' END AS 'timer_enabled', CASE WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'samegame' AND TABLE_NAME = 'samegame_games' AND COLUMN_NAME = 'timer_seconds') THEN 'YES' ELSE 'NO' END AS 'timer_seconds', CASE WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'samegame' AND TABLE_NAME = 'samegame_games' AND COLUMN_NAME = 'timer_mode') THEN 'YES' ELSE 'NO' END AS 'timer_mode', CASE WHEN EXISTS (SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'samegame' AND TABLE_NAME = 'samegame_games' AND COLUMN_NAME = 'auto_select_enabled') THEN 'YES' ELSE 'NO' END AS 'auto_select_enabled';"

echo.
echo ==========================================
echo If any columns show NO, run the migrations:
echo   docker exec -i %DB_CONTAINER% mysql -u%DB_USER% -p%DB_PASS% %DB_NAME% ^< database\migrations\add_game_options.sql
echo   docker exec -i %DB_CONTAINER% mysql -u%DB_USER% -p%DB_PASS% %DB_NAME% ^< database\migrations\add_timer_mode.sql
echo.
echo Note: Run this script from the project root directory (samegame/)
pause
