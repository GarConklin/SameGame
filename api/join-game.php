<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../src/GridGenerator.php';

$config = require __DIR__ . '/config.php';

try {
    // Get game code and player name
    $gameCode = strtoupper(trim($_POST['game_code'] ?? $_GET['game_code'] ?? ''));
    $playerName = $_POST['player_name'] ?? $_GET['player_name'] ?? 'Player 2';
    $playerName = substr(trim($playerName), 0, 50);
    if (empty($playerName)) {
        $playerName = 'Player 2';
    }
    
    if (empty($gameCode)) {
        throw new Exception("Game code is required");
    }
    
    // Connect to database
    $conn = new mysqli(
        $config['db']['host'],
        $config['db']['username'],
        $config['db']['password'],
        $config['db']['database']
    );
    
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    
    // Check if game exists and is waiting for player 2
    $stmt = $conn->prepare(
        "SELECT id, host_session, player1_name, game_status, num_tile_types, grid_width, grid_height, expires_at 
         FROM samegame_games 
         WHERE game_code = ? AND expires_at > NOW()"
    );
    $stmt->bind_param("s", $gameCode);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->close();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Game not found or expired'
        ]);
        exit;
    }
    
    $game = $result->fetch_assoc();
    $stmt->close();
    
    if ($game['game_status'] !== 'waiting') {
        $conn->close();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Game is not waiting for players'
        ]);
        exit;
    }
    
    // Generate session for player 2
    $player2Session = bin2hex(random_bytes(32));
    
    // Generate the initial grid for both players (same grid)
    $numTileTypes = (int)$game['num_tile_types'];
    $gridWidth = (int)$game['grid_width'];
    $gridHeight = (int)$game['grid_height'];
    $gridGenerator = new GridGenerator($numTileTypes, $gridWidth, $gridHeight);
    $initialGrid = $gridGenerator->generateGrid();
    $gridJson = json_encode($initialGrid);
    
    // Randomly choose who goes first (50/50 chance)
    $firstPlayer = (rand(0, 1) === 0) ? 1 : 2;
    $gameStatus = ($firstPlayer === 1) ? 'player1_turn' : 'player2_turn';
    
    // Update game with player 2 and initial grid
    $stmt = $conn->prepare(
        "UPDATE samegame_games 
         SET player2_session = ?, 
             player2_name = ?, 
             game_status = ?,
             current_player = ?,
             current_move_count = 0,
             player1_grid = ?,
             player2_grid = ?
         WHERE id = ?"
    );
    $stmt->bind_param("sssissi", $player2Session, $playerName, $gameStatus, $firstPlayer, $gridJson, $gridJson, $game['id']);
    
    if (!$stmt->execute()) {
        $stmt->close();
        $conn->close();
        throw new Exception("Failed to join game: " . $conn->error);
    }
    
    $stmt->close();
    $conn->close();
    
    echo json_encode([
        'success' => true,
        'game_code' => $gameCode,
        'session' => $player2Session,
        'player_name' => $playerName,
        'player_number' => 2,
        'opponent_name' => $game['player1_name']
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

