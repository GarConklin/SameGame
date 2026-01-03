<?php
/**
 * List Available Tile Sets API
 * Scans the images directory and returns tile sets that have all required files
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$imagesDir = __DIR__ . '/../images';
$requiredFiles = ['A.gif', 'As.gif', 'B.gif', 'Bs.gif', 'C.gif', 'Cs.gif', 'D.gif', 'Ds.gif', 'E.gif', 'Es.gif', 'F.gif', 'Fs.gif'];
$availableTileSets = [];

try {
    // Check if images directory exists
    if (!is_dir($imagesDir)) {
        echo json_encode([
            'success' => true,
            'tile_sets' => ['Letters'] // Default fallback
        ]);
        exit;
    }
    
    // Scan directories in images folder
    $dirs = array_filter(glob($imagesDir . '/*'), 'is_dir');
    
    foreach ($dirs as $dir) {
        $tileSetName = basename($dir);
        
        // Check if all required files exist
        $allFilesExist = true;
        foreach ($requiredFiles as $file) {
            if (!file_exists($dir . '/' . $file)) {
                $allFilesExist = false;
                break;
            }
        }
        
        if ($allFilesExist) {
            $availableTileSets[] = $tileSetName;
        }
    }
    
    // Sort alphabetically
    sort($availableTileSets);
    
    // If no valid tile sets found, return default
    if (empty($availableTileSets)) {
        $availableTileSets = ['Letters'];
    }
    
    echo json_encode([
        'success' => true,
        'tile_sets' => $availableTileSets
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'tile_sets' => ['Letters'] // Fallback
    ]);
}
