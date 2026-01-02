<?php
/**
 * Restart Game API
 * Generates a new board and resets scores while keeping the same game code and players
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$config = require __DIR__ . '/config.php';
require_once __DIR__ . '/../src/GridGenerator.php';

try {
    // Get game code and session from request
    $gameCode = strtoupper(trim($_POST['game_code'] ?? $_GET['game_code'] ?? ''));
    $session = $_POST['session'] ?? $_GET['session'] ?? '';
    
    if (empty($gameCode) || empty($session)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing game_code or session'
        ]);
        exit;
    }
    
    // Connect to database
    $conn = new mysqli(
        $config['db']['host'],
        $config['db']['username'],
        $config['db']['password'],
        $config['db']['database']
    );
    if ($conn->connect_error) {
        throw new Exception("Connection failed: " . $conn->connect_error);
    }
    
    // Get current game state
    $stmt = $conn->prepare(
        "SELECT id, host_session, player2_session, grid_width, grid_height, num_tile_types, moves_per_turn, current_player
         FROM samegame_games 
         WHERE game_code = ? AND (host_session = ? OR player2_session = ?)"
    );
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
    
    // Check game status - allow restart if completed, or if both players are in the game
    $stmt = $conn->prepare("SELECT game_status, player2_session FROM samegame_games WHERE id = ?");
    $stmt->bind_param("i", $game['id']);
    $stmt->execute();
    $statusResult = $stmt->get_result();
    $statusData = $statusResult->fetch_assoc();
    $stmt->close();
    
    // Only allow restart if game is completed (both players finished) or if both players have joined
    if ($statusData['game_status'] !== 'completed' && empty($statusData['player2_session'])) {
        $conn->close();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Both players must be in the game before restarting'
        ]);
        exit;
    }
    
    // Generate new grid using the game's settings
    $gridWidth = (int)$game['grid_width'];
    $gridHeight = (int)$game['grid_height'];
    $numTileTypes = (int)$game['num_tile_types'];
    $gridGenerator = new GridGenerator($numTileTypes, $gridWidth, $gridHeight);
    $newGrid = $gridGenerator->generateGrid();
    $newGridJson = json_encode($newGrid);
    
    // Alternate who goes first: if player 1 went first last time, player 2 goes first now
    $lastFirstPlayer = (int)$game['current_player'];
    $nextFirstPlayer = ($lastFirstPlayer === 1) ? 2 : 1;
    $gameStatus = ($nextFirstPlayer === 1) ? 'player1_turn' : 'player2_turn';
    
    // Reset game state: scores, grids, turn, status
    $stmt = $conn->prepare(
        "UPDATE samegame_games 
         SET player1_score = 0,
             player2_score = 0,
             player1_grid = ?,
             player2_grid = ?,
             current_player = ?,
             current_move_count = 0,
             game_status = ?
         WHERE id = ?"
    );
    $stmt->bind_param("ssisi", $newGridJson, $newGridJson, $nextFirstPlayer, $gameStatus, $game['id']);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to restart game: " . $conn->error);
    }
    
    $stmt->close();
    $conn->close();
    
    echo json_encode([
        'success' => true,
        'message' => 'Game restarted',
        'new_grid' => $newGrid
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

