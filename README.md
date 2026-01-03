# SameGame HTML5

A SameGame puzzle game converted from Java to HTML5.

## Running with Docker

### Option 1: Using Docker Compose (Recommended)

1. Build and start the container:
   ```bash
   docker compose up --build

## Database Schema

The database schema is automatically created from `database/schema.sql` when the database is first initialized. If you need to rebuild the database with the latest schema:

### Complete Rebuild (recommended for development)
   docker compose down -v
   docker compose up --build

This will:
- Stop all containers
- Remove the database volume (deletes all data)
- Rebuild and start containers with fresh database using the latest schema.sql

### Running Migrations (only if you need to preserve existing data)
If you have existing game data you want to keep, you can run migrations instead:

   docker compose exec db mysql -uroot -prootpass samegame -e "ALTER TABLE samegame_games ADD COLUMN moves_per_turn INT DEFAULT 1 AFTER current_player;"
   docker compose exec db mysql -uroot -prootpass samegame -e "ALTER TABLE samegame_games ADD COLUMN current_move_count INT DEFAULT 0 AFTER moves_per_turn;"
   docker compose exec db mysql -uroot -prootpass samegame -e "ALTER TABLE samegame_games ADD COLUMN num_tile_types INT DEFAULT 5 AFTER current_move_count;"
   docker compose exec db mysql -uroot -prootpass samegame -e "ALTER TABLE samegame_games ADD COLUMN player1_dice_roll INT NULL AFTER player2_name;"
   docker compose exec db mysql -uroot -prootpass samegame -e "ALTER TABLE samegame_games ADD COLUMN player2_dice_roll INT NULL AFTER player1_dice_roll;"
   ```

2. Open your browser and go to:
   ```
   http://localhost:8080
   ```

3. To stop the container:
   ```bash
   docker compose down
   ```

### Option 2: Using Docker directly

1. Build the image:
   ```bash
   docker build -t samegame .
   ```

2. Run the container:
   ```bash
   docker run -d -p 8080:80 --name samegame samegame
   ```

3. Open your browser and go to:
   ```
   http://localhost:8080
   ```

4. To stop the container:
   ```bash
   docker stop samegame
   docker rm samegame
   ```

## Running without Docker

Simply open `index.html` in a web browser. Note that some browsers may have restrictions on localStorage when opening files directly.

