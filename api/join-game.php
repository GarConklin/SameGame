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
        "SELECT id, host_session, player1_name, game_status, num_tile_types, grid_width, grid_height, player1_dice_roll, expires_at 
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
    
    // Roll dice for player 2 (1-6)
    $player2DiceRoll = rand(1, 6);
    $player1DiceRoll = (int)$game['player1_dice_roll'];
    
    // Compare dice rolls to determine first player
    // If tie, reroll both until there's a winner
    $firstPlayer = null;
    $isTie = false;
    
    // Keep rerolling until we have a winner (no tie)
    while ($player1DiceRoll === $player2DiceRoll) {
        $player1DiceRoll = rand(1, 6);
        $player2DiceRoll = rand(1, 6);
        $isTie = true; // Mark that there was at least one tie
    }
    
    // Determine first player based on higher roll
    if ($player1DiceRoll > $player2DiceRoll) {
        $firstPlayer = 1;
        $gameStatus = 'player1_turn';
    } else {
        $firstPlayer = 2;
        $gameStatus = 'player2_turn';
    }
    
    // Generate the initial grid for both players (same grid)
    $numTileTypes = (int)$game['num_tile_types'];
    $gridWidth = (int)$game['grid_width'];
    $gridHeight = (int)$game['grid_height'];
    $gridGenerator = new GridGenerator($numTileTypes, $gridWidth, $gridHeight);
    $initialGrid = $gridGenerator->generateGrid();
    $gridJson = json_encode($initialGrid);
    
    // Update game with player 2, dice rolls, and grid
    $stmt = $conn->prepare(
        "UPDATE samegame_games 
         SET player2_session = ?, 
             player2_name = ?, 
             player1_dice_roll = ?,
             player2_dice_roll = ?,
             game_status = ?,
             current_player = ?,
             current_move_count = 0,
             player1_grid = ?,
             player2_grid = ?
         WHERE id = ?"
    );
    $stmt->bind_param("ssiisissi", $player2Session, $playerName, $player1DiceRoll, $player2DiceRoll, $gameStatus, $firstPlayer, $gridJson, $gridJson, $game['id']);
    
    if (!$stmt->execute()) {
        $stmt->close();
        $conn->close();
        throw new Exception("Failed to join game: " . $conn->error);
    }
    
    $stmt->close();
    $conn->close();
    
    $response = [
        'success' => true,
        'game_code' => $gameCode,
        'session' => $player2Session,
        'player_name' => $playerName,
        'player_number' => 2,
        'opponent_name' => $game['player1_name'],
        'dice_roll' => $player2DiceRoll,
        'player1_dice_roll' => $player1DiceRoll,
        'had_tie' => $isTie,
        'first_player' => $firstPlayer
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

