// Tile Set Loader - Dynamically detects and loads available tile sets

const API_BASE = window.location.origin + '/api';

/**
 * Get list of available tile sets from the server
 */
async function getAvailableTileSets() {
    try {
        const response = await fetch(`${API_BASE}/list-tile-sets.php`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.tile_sets)) {
            return data.tile_sets;
        }
        
        // Fallback to default if API fails
        return ['Letters'];
    } catch (error) {
        console.error('Error fetching tile sets:', error);
        // Fallback to default tile sets
        return ['Letters'];
    }
}

/**
 * Populate a tile set select dropdown with available tile sets
 */
async function populateTileSetSelect(selectElement, selectedValue = 'Letters') {
    if (!selectElement) return;
    
    const tileSets = await getAvailableTileSets();
    
    // Clear existing options
    selectElement.innerHTML = '';
    
    // Add options for each available tile set
    tileSets.forEach(tileSet => {
        const option = document.createElement('option');
        option.value = tileSet;
        option.textContent = tileSet;
        selectElement.appendChild(option);
    });
    
    // Set the selected value if it exists in the available sets
    if (tileSets.includes(selectedValue)) {
        selectElement.value = selectedValue;
    } else if (tileSets.length > 0) {
        selectElement.value = tileSets[0];
    }
}
