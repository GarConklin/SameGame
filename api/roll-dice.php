<?php
/**
 * Roll Dice API
 * Allows players to roll dice to determine starting player
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$config = require __DIR__ . '/config.php';

try {
    $gameCode = strtoupper(trim($_POST['game_code'] ?? $_GET['game_code'] ?? ''));
    $session = $_POST['session'] ?? $_GET['session'] ?? '';
    
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
    
    // Get game state
    $stmt = $conn->prepare(
        "SELECT id, host_session, player2_session, player1_dice_roll, player2_dice_roll, game_status
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
            'error' => 'Game not found'
        ]);
        exit;
    }
    
    $game = $result->fetch_assoc();
    $stmt->close();
    
    // Determine player number
    $playerNumber = ($game['host_session'] === $session) ? 1 : 2;
    
    // Roll dice (1-6)
    $diceRoll = rand(1, 6);
    
    // Update the dice roll for this player
    if ($playerNumber === 1) {
        $stmt = $conn->prepare(
            "UPDATE samegame_games SET player1_dice_roll = ? WHERE id = ?"
        );
    } else {
        $stmt = $conn->prepare(
            "UPDATE samegame_games SET player2_dice_roll = ? WHERE id = ?"
        );
    }
    $stmt->bind_param("ii", $diceRoll, $game['id']);
    $stmt->execute();
    $stmt->close();
    
    // Get updated game state to check if both players have rolled
    $stmt = $conn->prepare(
        "SELECT player1_dice_roll, player2_dice_roll FROM samegame_games WHERE id = ?"
    );
    $stmt->bind_param("i", $game['id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $gameData = $result->fetch_assoc();
    $stmt->close();
    $conn->close();
    
    $player1Roll = $gameData['player1_dice_roll'];
    $player2Roll = $gameData['player2_dice_roll'];
    $bothRolled = ($player1Roll !== null && $player2Roll !== null);
    
    echo json_encode([
        'success' => true,
        'dice_roll' => $diceRoll,
        'player_number' => $playerNumber,
        'player1_roll' => $player1Roll,
        'player2_roll' => $player2Roll,
        'both_rolled' => $bothRolled,
        'is_tie' => $bothRolled && ($player1Roll === $player2Roll)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
