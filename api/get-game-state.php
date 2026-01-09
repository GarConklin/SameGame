<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config.php';

$config = require __DIR__ . '/config.php';

try {
    $gameCode = strtoupper(trim($_GET['game_code'] ?? ''));
    $session = urldecode(trim($_GET['session'] ?? ''));
    
    if (empty($gameCode) || empty($session)) {
        throw new Exception("Game code and session are required");
    }
    
    // Connect to database
    $conn = new mysqli(
        $config['db']['host'],
        $config['db']['username'],
        $config['db']['password'],
        $config['db']['database']
    );
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed");
    }
    
    // Check if new columns exist (for backward compatibility)
    $result = $conn->query("SHOW COLUMNS FROM samegame_games LIKE 'tile_type_multiplier_enabled'");
    $hasNewColumns = ($result && $result->num_rows > 0);
    
    // Check if timer_mode column exists
    $result = $conn->query("SHOW COLUMNS FROM samegame_games LIKE 'timer_mode'");
    $hasTimerMode = ($result && $result->num_rows > 0);
    
    // Get game state - use different SELECT based on whether new columns exist
    if ($hasNewColumns && $hasTimerMode) {
        // All new columns including timer_mode exist
        $stmt = $conn->prepare(
            "SELECT id, host_session, player2_session, player1_name, player2_name,
                    player1_score, player2_score, current_player, game_status,
                    moves_per_turn, current_move_count, num_tile_types, grid_width, grid_height, tile_set,
                    tile_type_multiplier_enabled, timer_enabled, timer_seconds, timer_mode, auto_select_enabled,
                    player1_grid, player2_grid, player1_dice_roll, player2_dice_roll
             FROM samegame_games 
             WHERE game_code = ? AND (host_session = ? OR player2_session = ?)"
        );
    } else if ($hasNewColumns) {
        // New columns exist but not timer_mode
        $stmt = $conn->prepare(
            "SELECT id, host_session, player2_session, player1_name, player2_name,
                    player1_score, player2_score, current_player, game_status,
                    moves_per_turn, current_move_count, num_tile_types, grid_width, grid_height, tile_set,
                    tile_type_multiplier_enabled, timer_enabled, timer_seconds, auto_select_enabled,
                    player1_grid, player2_grid, player1_dice_roll, player2_dice_roll
             FROM samegame_games 
             WHERE game_code = ? AND (host_session = ? OR player2_session = ?)"
        );
    } else {
        $stmt = $conn->prepare(
            "SELECT id, host_session, player2_session, player1_name, player2_name,
                    player1_score, player2_score, current_player, game_status,
                    moves_per_turn, current_move_count, num_tile_types, grid_width, grid_height, tile_set,
                    player1_grid, player2_grid, player1_dice_roll, player2_dice_roll
             FROM samegame_games 
             WHERE game_code = ? AND (host_session = ? OR player2_session = ?)"
        );
    }
    $stmt->bind_param("sss", $gameCode, $session, $session);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Game not found or invalid session'
        ]);
        exit;
    }
    
    $game = $result->fetch_assoc();
    $stmt->close();
    
    // Debug logging for game options
    if ($hasNewColumns) {
        error_log("Get game state: tile_type_multiplier_enabled=" . ($game['tile_type_multiplier_enabled'] ?? 'null') . 
                  " (type: " . gettype($game['tile_type_multiplier_enabled'] ?? null) . ")" .
                  ", timer_enabled=" . ($game['timer_enabled'] ?? 'null') .
                  ", num_tile_types=" . ($game['num_tile_types'] ?? 'null'));
    } else {
        error_log("Get game state: New columns not found in database - using defaults");
    }
    
    // Determine which player this session is
    // Use strict comparison and trim to avoid whitespace issues
    $hostSession = trim($game['host_session']);
    $player2Session = trim($game['player2_session'] ?? '');
    $session = trim($session);
    
    // Check which session matches
    $matchesHost = ($hostSession === $session);
    $matchesPlayer2 = ($player2Session === $session);
    
    if ($matchesHost) {
        $playerNumber = 1;
    } elseif ($matchesPlayer2) {
        $playerNumber = 2;
    } else {
        // Fallback - shouldn't happen but log it
        error_log("WARNING: Session doesn't match either player! host: '$hostSession', player2: '$player2Session', provided: '$session'");
        $playerNumber = ($hostSession === $session) ? 1 : 2; // Original logic as fallback
    }
    
    // Decode JSON grids
    $player1Grid = $game['player1_grid'] ? json_decode($game['player1_grid'], true) : null;
    $player2Grid = $game['player2_grid'] ? json_decode($game['player2_grid'], true) : null;
    
    // Debug logging
    if ($player1Grid && is_array($player1Grid)) {
        error_log("Get game state: Player 1 grid dimensions " . count($player1Grid) . "x" . (count($player1Grid[0] ?? [])));
    }
    if ($player2Grid && is_array($player2Grid)) {
        error_log("Get game state: Player 2 grid dimensions " . count($player2Grid) . "x" . (count($player2Grid[0] ?? [])));
    }
    
    $conn->close();
    
    // Return debug info in development (remove in production)
    $debug = [
        'host_session_length' => strlen($hostSession),
        'player2_session_length' => strlen($player2Session),
        'provided_session_length' => strlen($session),
        'matches_host' => $matchesHost,
        'matches_player2' => $matchesPlayer2
    ];
    
    echo json_encode([
        'success' => true,
        'game_code' => $gameCode,
        'player_number' => $playerNumber,
        'player1_name' => $game['player1_name'],
        'player2_name' => $game['player2_name'],
        'player1_score' => (int)$game['player1_score'],
        'player2_score' => (int)$game['player2_score'],
        'current_player' => (int)$game['current_player'],
        'game_status' => $game['game_status'],
        'moves_per_turn' => (int)$game['moves_per_turn'],
        'current_move_count' => (int)$game['current_move_count'],
        'num_tile_types' => (int)$game['num_tile_types'],
        'grid_width' => (int)$game['grid_width'],
        'grid_height' => (int)$game['grid_height'],
        'tile_set' => $game['tile_set'] ?? 'Squares',
        'tile_type_multiplier_enabled' => $hasNewColumns ? (bool)($game['tile_type_multiplier_enabled'] ?? false) : false,
        'timer_enabled' => $hasNewColumns ? (bool)($game['timer_enabled'] ?? false) : false,
        'timer_seconds' => $hasNewColumns ? (int)($game['timer_seconds'] ?? 60) : 60,
        'timer_mode' => ($hasNewColumns && isset($game['timer_mode'])) ? $game['timer_mode'] : 'per_move',
        'auto_select_enabled' => $hasNewColumns ? (bool)($game['auto_select_enabled'] ?? false) : false,
        'your_grid' => $playerNumber === 1 ? $player1Grid : $player2Grid,
        'opponent_score' => $playerNumber === 1 ? (int)$game['player2_score'] : (int)$game['player1_score'],
        'player1_dice_roll' => $game['player1_dice_roll'] !== null ? (int)$game['player1_dice_roll'] : null,
        'player2_dice_roll' => $game['player2_dice_roll'] !== null ? (int)$game['player2_dice_roll'] : null,
        'debug' => $debug // Remove this in production
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

