<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/../src/GameCodeGenerator.php';

$config = require __DIR__ . '/config.php';

try {
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
    
    // Get player name and game options from request
    $playerName = $_POST['player_name'] ?? $_GET['player_name'] ?? 'Player 1';
    $playerName = substr(trim($playerName), 0, 50);
    if (empty($playerName)) {
        $playerName = 'Player 1';
    }
    
    // Get moves per turn (1-5, default 1)
    $movesPerTurn = (int)($_POST['moves_per_turn'] ?? $_GET['moves_per_turn'] ?? 1);
    if ($movesPerTurn < 1) $movesPerTurn = 1;
    if ($movesPerTurn > 5) $movesPerTurn = 5;
    
    // Get number of tile types (2-6, default 4)
    $numTileTypes = (int)($_POST['num_tile_types'] ?? $_GET['num_tile_types'] ?? 4);
    if ($numTileTypes < 2) $numTileTypes = 2;
    if ($numTileTypes > 6) $numTileTypes = 6;
    
    // Get grid dimensions (20-60 width, 10-30 height, default 40x20)
    $gridWidth = (int)($_POST['grid_width'] ?? $_GET['grid_width'] ?? 40);
    if ($gridWidth < 20) $gridWidth = 20;
    if ($gridWidth > 60) $gridWidth = 60;
    
    $gridHeight = (int)($_POST['grid_height'] ?? $_GET['grid_height'] ?? 20);
    if ($gridHeight < 10) $gridHeight = 10;
    if ($gridHeight > 30) $gridHeight = 30;
    
    // Get tile set and validate it exists with all required files
    $tileSet = $_POST['tile_set'] ?? $_GET['tile_set'] ?? 'Squares';
    $tileSetDir = __DIR__ . '/../images/' . basename($tileSet);
    $requiredFiles = ['A.gif', 'As.gif', 'B.gif', 'Bs.gif', 'C.gif', 'Cs.gif', 'D.gif', 'Ds.gif', 'E.gif', 'Es.gif', 'F.gif', 'Fs.gif'];
    
    // Validate tile set directory exists and has all required files
    $isValid = is_dir($tileSetDir);
    if ($isValid) {
        foreach ($requiredFiles as $file) {
            if (!file_exists($tileSetDir . '/' . $file)) {
                $isValid = false;
                break;
            }
        }
    }
    
    if (!$isValid) {
        $tileSet = 'Squares'; // Default fallback
    }
    
    // Get game options
    $tileTypeMultiplierEnabled = isset($_POST['tile_type_multiplier_enabled']) && $_POST['tile_type_multiplier_enabled'] === '1';
    $timerEnabled = isset($_POST['timer_enabled']) && $_POST['timer_enabled'] === '1';
    $timerSeconds = $timerEnabled ? (int)($_POST['timer_seconds'] ?? 60) : 0;
    if ($timerSeconds < 15) $timerSeconds = 15;
    if ($timerSeconds > 180) $timerSeconds = 180;
    $autoSelectEnabled = $timerEnabled && isset($_POST['auto_select_enabled']) && $_POST['auto_select_enabled'] === '1';
    
    // Generate session ID for host
    $hostSession = bin2hex(random_bytes(32));
    
    // Generate unique game code
    $codeGenerator = new GameCodeGenerator($conn);
    $gameCode = $codeGenerator->generateUniqueCode();
    
    // Set expiration (24 hours)
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
    
    // Roll dice for player 1 (1-6)
    $player1DiceRoll = rand(1, 6);
    
    // Check if new columns exist (for backward compatibility with pre-migration databases)
    $result = $conn->query("SHOW COLUMNS FROM samegame_games LIKE 'tile_type_multiplier_enabled'");
    $hasNewColumns = ($result && $result->num_rows > 0);
    
    // Create game record - use different SQL based on whether new columns exist
    if ($hasNewColumns) {
        $stmt = $conn->prepare(
            "INSERT INTO samegame_games 
             (game_code, host_session, player1_name, game_status, moves_per_turn, num_tile_types, grid_width, grid_height, tile_set, tile_type_multiplier_enabled, timer_enabled, timer_seconds, auto_select_enabled, player1_dice_roll, expires_at) 
             VALUES (?, ?, ?, 'waiting', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("sssiiiisiiiiis", $gameCode, $hostSession, $playerName, $movesPerTurn, $numTileTypes, $gridWidth, $gridHeight, $tileSet, $tileTypeMultiplierEnabled, $timerEnabled, $timerSeconds, $autoSelectEnabled, $player1DiceRoll, $expiresAt);
    } else {
        // Fallback for databases without the new columns (use defaults)
        $stmt = $conn->prepare(
            "INSERT INTO samegame_games 
             (game_code, host_session, player1_name, game_status, moves_per_turn, num_tile_types, grid_width, grid_height, tile_set, player1_dice_roll, expires_at) 
             VALUES (?, ?, ?, 'waiting', ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->bind_param("sssiiiisis", $gameCode, $hostSession, $playerName, $movesPerTurn, $numTileTypes, $gridWidth, $gridHeight, $tileSet, $player1DiceRoll, $expiresAt);
        // Reset new options to defaults since columns don't exist
        $tileTypeMultiplierEnabled = false;
        $timerEnabled = false;
        $timerSeconds = 60;
        $autoSelectEnabled = false;
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to create game: " . $conn->error);
    }
    
    $gameId = $conn->insert_id;
    $stmt->close();
    $conn->close();
    
    echo json_encode([
        'success' => true,
        'game_code' => $gameCode,
        'session' => $hostSession,
        'player_name' => $playerName,
        'player_number' => 1,
        'moves_per_turn' => $movesPerTurn,
        'num_tile_types' => $numTileTypes,
        'grid_width' => $gridWidth,
        'grid_height' => $gridHeight,
        'tile_set' => $tileSet,
        'tile_type_multiplier_enabled' => $tileTypeMultiplierEnabled,
        'timer_enabled' => $timerEnabled,
        'timer_seconds' => $timerSeconds,
        'auto_select_enabled' => $autoSelectEnabled,
        'dice_roll' => $player1DiceRoll
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

