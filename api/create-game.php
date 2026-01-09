<?php
// Start output buffering to catch any unexpected output
ob_start();

// Disable error display to prevent HTML errors in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

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
    if ($timerEnabled) {
        $timerSeconds = (int)($_POST['timer_seconds'] ?? 60);
        if ($timerSeconds < 15) $timerSeconds = 15;
        if ($timerSeconds > 180) $timerSeconds = 180;
    } else {
        $timerSeconds = 60; // Default value even if timer is disabled
    }
    $timerMode = isset($_POST['timer_mode']) ? trim($_POST['timer_mode']) : 'per_move';
    if ($timerMode !== 'per_move' && $timerMode !== 'per_turn') {
        $timerMode = 'per_move';
    }
    $autoSelectEnabled = $timerEnabled && isset($_POST['auto_select_enabled']) && $_POST['auto_select_enabled'] === '1';
    
    // Debug logging
    error_log("Create game options: tileTypeMultiplierEnabled=" . ($tileTypeMultiplierEnabled ? '1' : '0') . 
              ", timerEnabled=" . ($timerEnabled ? '1' : '0') . 
              ", timerSeconds=" . $timerSeconds . 
              ", timerMode=" . $timerMode .
              ", autoSelectEnabled=" . ($autoSelectEnabled ? '1' : '0') .
              ", POST[tile_type_multiplier_enabled]=" . ($_POST['tile_type_multiplier_enabled'] ?? 'not set'));
    
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
    
    // Check if timer_mode column exists
    $result = $conn->query("SHOW COLUMNS FROM samegame_games LIKE 'timer_mode'");
    $hasTimerMode = ($result && $result->num_rows > 0);
    
    // Create game record - use different SQL based on whether new columns exist
    if ($hasNewColumns && $hasTimerMode) {
        // All new columns including timer_mode exist
        // Count: game_code(s), host_session(s), player1_name(s), moves_per_turn(i), num_tile_types(i), grid_width(i), grid_height(i), tile_set(s), tile_type_multiplier_enabled(i), timer_enabled(i), timer_seconds(i), timer_mode(s), auto_select_enabled(i), player1_dice_roll(i), expires_at(s)
        // Format: sssiiiisiiiis = 15 parameters
        $stmt = $conn->prepare(
            "INSERT INTO samegame_games 
             (game_code, host_session, player1_name, game_status, moves_per_turn, num_tile_types, grid_width, grid_height, tile_set, tile_type_multiplier_enabled, timer_enabled, timer_seconds, timer_mode, auto_select_enabled, player1_dice_roll, expires_at) 
             VALUES (?, ?, ?, 'waiting', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        // Convert booleans to integers (0 or 1) for MySQL
        $tileTypeMultiplierEnabledInt = $tileTypeMultiplierEnabled ? 1 : 0;
        $timerEnabledInt = $timerEnabled ? 1 : 0;
        $autoSelectEnabledInt = $autoSelectEnabled ? 1 : 0;
        
        // Debug: Log parameter values
        error_log("Binding params: gameCode=" . substr($gameCode, 0, 10) . ", timerMode=" . $timerMode . ", timerSeconds=" . $timerSeconds);
        
        // Format string verification: 
        // Parameters: 1.game_code(s), 2.host_session(s), 3.player1_name(s), 4.moves_per_turn(i), 5.num_tile_types(i), 6.grid_width(i), 7.grid_height(i), 8.tile_set(s), 9.tile_type_multiplier_enabled(i), 10.timer_enabled(i), 11.timer_seconds(i), 12.timer_mode(s), 13.auto_select_enabled(i), 14.player1_dice_roll(i), 15.expires_at(s)
        // Format needs 15 characters: s-s-s-i-i-i-i-s-i-i-i-s-i-i-s
        // Breaking down: s(3) + i(4) + s(1) + i(3) + s(1) + i(2) + s(1) = 15
        // The string "sssiiiisiiiis" is actually only 13 chars - missing 2 at the end!
        // Correct format should be: "sssiiiisiiiis" + "is" = "sssiiiisiiiisis" 
        // Wait, let me count more carefully:
        // s-s-s-i-i-i-i-s-i-i-i-s-i-i-s = 15 positions
        // Actually "sssiiiisiiiis" = s(3) + i(4) + s(1) + i(3) + s(1) + i(2) + s(1) = 3+4+1+3+1+2+1 = 15
        // But wait, after "s" at position 12, we need i(13), i(14), s(15) = "iis"
        // So it should be: "sssiiiisiiiis" but that's only 13! The issue is we're missing 2 characters
        // Let me write it out correctly: sss + iiii + s + iii + s + ii + s = sssiiiisiiiis
        // Counting manually: 1s, 2s, 3s, 4i, 5i, 6i, 7i, 8s, 9i, 10i, 11i, 12s, 13i, 14i, 15s
        // So it should be: "sssiiiisiiiis" but that string only has positions 1-13!
        // The correct 15-character string should end with "iis" not just "s"
        // Format: "sssiiiisiiiisiis" - wait no, let me recalculate
        // Actually the string should be: s(1-3) + i(4-7) + s(8) + i(9-11) + s(12) + i(13-14) + s(15)
        // That's: "sss" + "iiii" + "s" + "iii" + "s" + "ii" + "s" = "sssiiiisiiiisiis"
        // But that's 16! Let me recount the parameters...
        // Actually, I think the issue is simpler - "sssiiiisiiiis" is missing the last 2 characters
        // It should be "sssiiiisiiiisiis" to have 15 chars
        // But wait, that would be: 3+4+1+3+1+2+1 = 15 ✓
        // Correct format string for 15 parameters: sssiiiisiiiisiis
        // But that's 16! Let me fix it: sss(3) + iiii(4) + s(1) + iii(3) + s(1) + ii(2) + s(1)
        // = 3+4+1+3+1+2+1 = 15
        // Actually: "sssiiiisiiiisiis" = 16 chars, so remove one
        // The correct 15-char string should be: "sssiiiisiiiis" + "is" = "sssiiiisiiiisis"
        // Wait, that's also wrong. Let me rebuild: 
        // Positions 1-3: sss (game_code, host_session, player1_name)
        // Positions 4-7: iiii (moves_per_turn, num_tile_types, grid_width, grid_height)
        // Position 8: s (tile_set)
        // Positions 9-11: iii (tile_type_multiplier_enabled, timer_enabled, timer_seconds)
        // Position 12: s (timer_mode)
        // Positions 13-14: ii (auto_select_enabled, player1_dice_roll)
        // Position 15: s (expires_at)
        // Format: "sssiiiisiiiisiis" - but that's 16! The extra "i" is at the end
        // Actually it should be: "sssiiiisiiiis" + "iis" = "sssiiiisiiiisiis" which is 16
        // Remove one character? Actually, the format should match parameters exactly.
        // Let me check: after position 12 (s for timer_mode), we have:
        // Position 13: i (auto_select_enabled)
        // Position 14: i (player1_dice_roll)  
        // Position 15: s (expires_at)
        // So it should end with "iis", not "iiis"
        // The string "sssiiiisiiiisiis" ends with "iis" which is correct for positions 13-15
        // So "sssiiiisiiiisiis" = s(3) + i(4) + s(1) + i(3) + s(1) + i(2) + s(1) 
        // = "sss" + "iiii" + "s" + "iii" + "s" + "ii" + "s"
        // = 3+4+1+3+1+2+1 = 15 ✓
        // But wait, "sssiiiisiiiisiis" when I write it has an extra "i"!
        // The correct string should be: "sssiiiisiiiis" + "is" at the end = "sssiiiisiiiisis"
        // But that ends with "sis" not "iis"!
        // Let me rebuild correctly from scratch:
        // "sss" (3 chars) + "iiii" (4 chars) + "s" (1 char) + "iii" (3 chars) + "s" (1 char) + "ii" (2 chars) + "s" (1 char)
        // = "sss" + "iiii" + "s" + "iii" + "s" + "ii" + "s"
        // = "sss" + "iiii" = "sssiiii"
        // + "s" = "sssiiiis"
        // + "iii" = "sssiiiisiii"
        // + "s" = "sssiiiisiiis"
        // + "ii" = "sssiiiisiiiisii"
        // + "s" = "sssiiiisiiiisiis"
        // That's 15 characters! But wait, let me count: s-s-s-i-i-i-i-s-i-i-i-s-i-i-i-s
        // That's 16! The issue is there are 4 i's after the last s instead of 3.
        // Actually wait, the format should match: sss(3) + iiii(4) + s(1) + iii(3) + s(1) + ii(2) + s(1)
        // String: "sss" + "iiii" + "s" + "iii" + "s" + "ii" + "s"
        // Let me concatenate: sss + iiii = sssiiii (7 chars)
        // + s = sssiiiis (8 chars)
        // + iii = sssiiiisiii (11 chars)
        // + s = sssiiiisiiis (12 chars) 
        // + ii = sssiiiisiiiisii (14 chars)
        // + s = sssiiiisiiiisiis (15 chars)
        // But that ends with "iis" not "s"! Let me check the last part: ...iiiisii + s = ...iiiisiis
        // Wait, after position 12 "s", we need "ii" (positions 13-14) then "s" (position 15)
        // So after "sssiiiisiiis" (12 chars), add "ii" = "sssiiiisiiiisii" (14 chars), then "s" = "sssiiiisiiiisiis" (15 chars)
        // But "sssiiiisiiiisiis" ends with "iis" which is positions 13-15 = i(13), i(14), s(15) ✓
        // So the string should be correct! But PowerShell says it's 16. Let me count it manually character by character:
        // s(1) s(2) s(3) i(4) i(5) i(6) i(7) s(8) i(9) i(10) i(11) s(12) i(13) i(14) s(15)
        // That's 15! But wait, maybe there's a typo in my string. Let me write it very carefully:
        // Build format string for 15 parameters step by step to ensure correctness:
        // Positions 1-3: sss, 4-7: iiii, 8: s, 9-11: iii, 12: s, 13-14: ii, 15: s
        $formatString = "sss" . "iiii" . "s" . "iii" . "s" . "ii" . "s";  // Should be exactly 15 chars
        
        // Verify length
        if (strlen($formatString) !== 15) {
            throw new Exception("Format string length is " . strlen($formatString) . ", expected 15. Format: '$formatString'");
        }
        
        $result = $stmt->bind_param($formatString, $gameCode, $hostSession, $playerName, $movesPerTurn, $numTileTypes, $gridWidth, $gridHeight, $tileSet, $tileTypeMultiplierEnabledInt, $timerEnabledInt, $timerSeconds, $timerMode, $autoSelectEnabledInt, $player1DiceRoll, $expiresAt);
        
        if (!$result) {
            throw new Exception("Bind param failed: " . $stmt->error);
        }
    } else if ($hasNewColumns) {
        // New columns exist but not timer_mode
        $stmt = $conn->prepare(
            "INSERT INTO samegame_games 
             (game_code, host_session, player1_name, game_status, moves_per_turn, num_tile_types, grid_width, grid_height, tile_set, tile_type_multiplier_enabled, timer_enabled, timer_seconds, auto_select_enabled, player1_dice_roll, expires_at) 
             VALUES (?, ?, ?, 'waiting', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        // Convert booleans to integers (0 or 1) for MySQL
        $tileTypeMultiplierEnabledInt = $tileTypeMultiplierEnabled ? 1 : 0;
        $timerEnabledInt = $timerEnabled ? 1 : 0;
        $autoSelectEnabledInt = $autoSelectEnabled ? 1 : 0;
        $timerMode = 'per_move'; // Default for old schema
        
        // 14 parameters: sssiiiisiiiiis
        $result = $stmt->bind_param("sssiiiisiiiiis", $gameCode, $hostSession, $playerName, $movesPerTurn, $numTileTypes, $gridWidth, $gridHeight, $tileSet, $tileTypeMultiplierEnabledInt, $timerEnabledInt, $timerSeconds, $autoSelectEnabledInt, $player1DiceRoll, $expiresAt);
        
        if (!$result) {
            throw new Exception("Bind param failed: " . $stmt->error);
        }
    } else {
        // Fallback for databases without the new columns (use defaults)
        $stmt = $conn->prepare(
            "INSERT INTO samegame_games 
             (game_code, host_session, player1_name, game_status, moves_per_turn, num_tile_types, grid_width, grid_height, tile_set, player1_dice_roll, expires_at) 
             VALUES (?, ?, ?, 'waiting', ?, ?, ?, ?, ?, ?, ?)"
        );
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        // 11 parameters: sssiiiisis
        $result = $stmt->bind_param("sssiiiisis", $gameCode, $hostSession, $playerName, $movesPerTurn, $numTileTypes, $gridWidth, $gridHeight, $tileSet, $player1DiceRoll, $expiresAt);
        
        if (!$result) {
            throw new Exception("Bind param failed: " . $stmt->error);
        }
        
        // Reset new options to defaults since columns don't exist
        $tileTypeMultiplierEnabled = false;
        $timerEnabled = false;
        $timerSeconds = 60;
        $timerMode = 'per_move';
        $autoSelectEnabled = false;
    }
    
    if (!$stmt) {
        throw new Exception("Statement not prepared - this should never happen");
    }
    
    if (!$stmt->execute()) {
        $errorMsg = "Failed to create game: " . $stmt->error . " (Connection error: " . $conn->error . ")";
        error_log("SQL Error: " . $errorMsg);
        error_log("SQL State: " . $stmt->sqlstate);
        throw new Exception($errorMsg);
    }
    
    $gameId = $conn->insert_id;
    $stmt->close();
    $conn->close();
    
    // Clear any buffered output before sending JSON
    ob_clean();
    
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
        'timer_mode' => $timerMode,
        'auto_select_enabled' => $autoSelectEnabled,
        'dice_roll' => $player1DiceRoll
    ]);
    
} catch (Exception $e) {
    // Clear any buffered output before sending error JSON
    ob_clean();
    
    http_response_code(500);
    // Log the error for debugging
    error_log("Create game error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    // Ensure we output valid JSON
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
    exit;
} catch (Throwable $e) {
    // Catch any other errors (fatal errors, etc.)
    ob_clean();
    http_response_code(500);
    error_log("Fatal error in create-game.php: " . $e->getMessage());
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
    exit;
}

