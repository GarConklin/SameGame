<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../src/GameValidator.php';

$config = require __DIR__ . '/config.php';

try {
    $gameCode = strtoupper(trim($_POST['game_code'] ?? ''));
    $session = $_POST['session'] ?? '';
    $score = (int)($_POST['score'] ?? 0);
    $grid = $_POST['grid'] ?? null;
    
    if (empty($gameCode) || empty($session)) {
        throw new Exception("Game code and session are required");
    }
    
    if ($score < 0) {
        throw new Exception("Invalid score");
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
    
    // Get current game state
    $stmt = $conn->prepare(
        "SELECT id, host_session, player2_session, current_player, game_status, moves_per_turn, current_move_count
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
    
    // Check if it's this player's turn
    if ((int)$game['current_player'] !== $playerNumber) {
        $conn->close();
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Not your turn'
        ]);
        exit;
    }
    
    // Update score and grid
    $grid = $_POST['grid'] ?? null;
    $gridArray = $grid ? json_decode($grid, true) : null;
    
    if ($gridArray && is_array($gridArray)) {
        error_log("Submit score: Received grid with dimensions " . count($gridArray) . "x" . (count($gridArray[0] ?? [])));
    } else {
        error_log("Submit score: Invalid or missing grid data");
    }
    
    $gridJson = $gridArray ? json_encode($gridArray) : null;
    
    // Check if there are valid moves remaining on the board
    $hasValidMoves = GameValidator::hasValidMoves($gridArray);
    
    // Increment move count
    $newMoveCount = (int)$game['current_move_count'] + 1;
    $movesPerTurn = (int)$game['moves_per_turn'];
    
    // Check if player has used all their moves
    $turnComplete = ($newMoveCount >= $movesPerTurn);
    
    // Game is only complete when there are no valid moves left
    $gameComplete = !$hasValidMoves;
    
    // When Player 1 finishes their turn, switch to Player 2 (unless game is complete)
    // When Player 2 finishes their turn, switch back to Player 1 (unless game is complete)
    if ($playerNumber === 1) {
        if ($turnComplete || $gameComplete) {
            if ($gameComplete) {
                // No moves left - game is over
                $stmt = $conn->prepare(
                    "UPDATE samegame_games 
                     SET player1_score = ?, 
                         player1_grid = ?,
                         player2_grid = ?,
                         current_player = 1,
                         current_move_count = 0,
                         game_status = 'completed'
                     WHERE id = ?"
                );
                $stmt->bind_param("issi", $score, $gridJson, $gridJson, $game['id']);
            } else {
                // Switch to Player 2
                $stmt = $conn->prepare(
                    "UPDATE samegame_games 
                     SET player1_score = ?, 
                         player1_grid = ?,
                         player2_grid = ?,
                         current_player = 2,
                         current_move_count = 0,
                         game_status = 'player2_turn'
                     WHERE id = ?"
                );
                $stmt->bind_param("issi", $score, $gridJson, $gridJson, $game['id']);
            }
        } else {
            // More moves remaining for Player 1
            $stmt = $conn->prepare(
                "UPDATE samegame_games 
                 SET player1_score = ?, 
                     player1_grid = ?,
                     player2_grid = ?,
                     current_move_count = ?
                 WHERE id = ?"
            );
            $stmt->bind_param("issii", $score, $gridJson, $gridJson, $newMoveCount, $game['id']);
        }
    } else {
        // Player 2
        if ($turnComplete || $gameComplete) {
            if ($gameComplete) {
                // No moves left - game is over
                $stmt = $conn->prepare(
                    "UPDATE samegame_games 
                     SET player2_score = ?, 
                         player2_grid = ?,
                         player1_grid = ?,
                         current_player = 2,
                         current_move_count = 0,
                         game_status = 'completed'
                     WHERE id = ?"
                );
                $stmt->bind_param("issi", $score, $gridJson, $gridJson, $game['id']);
            } else {
                // Switch back to Player 1
                $stmt = $conn->prepare(
                    "UPDATE samegame_games 
                     SET player2_score = ?, 
                         player2_grid = ?,
                         player1_grid = ?,
                         current_player = 1,
                         current_move_count = 0,
                         game_status = 'player1_turn'
                     WHERE id = ?"
                );
                $stmt->bind_param("issi", $score, $gridJson, $gridJson, $game['id']);
            }
        } else {
            // More moves remaining for Player 2
            $stmt = $conn->prepare(
                "UPDATE samegame_games 
                 SET player2_score = ?, 
                     player2_grid = ?,
                     player1_grid = ?,
                     current_move_count = ?
                 WHERE id = ?"
            );
            $stmt->bind_param("issii", $score, $gridJson, $gridJson, $newMoveCount, $game['id']);
        }
    }
    
    if (!$stmt->execute()) {
        $stmt->close();
        $conn->close();
        throw new Exception("Failed to submit score: " . $conn->error);
    }
    
    $stmt->close();
    $conn->close();
    
    echo json_encode([
        'success' => true,
        'score' => $score,
        'moves_remaining' => $turnComplete ? 0 : ($movesPerTurn - $newMoveCount),
        'turn_complete' => $turnComplete || $gameComplete,
        'next_player' => ($turnComplete || $gameComplete) ? ($playerNumber === 1 ? 2 : 1) : null,
        'game_complete' => $gameComplete,
        'has_valid_moves' => $hasValidMoves
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

