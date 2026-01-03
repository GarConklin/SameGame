// Tile Set Loader - Dynamically detects and loads available tile sets

// Use API_BASE from lobby.js if available, otherwise construct it
const API_BASE = typeof window !== 'undefined' && window.location ? (window.location.origin + '/api') : '/api';

/**
 * Get list of available tile sets from the server
 */
async function getAvailableTileSets() {
    try {
        const response = await fetch(`${API_BASE}/list-tile-sets.php`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success && Array.isArray(data.tile_sets) && data.tile_sets.length > 0) {
            return data.tile_sets;
        }
        
        // Fallback to common tile sets if API returns empty
        console.warn('API returned empty tile sets, using fallback');
        return ['Letters', 'Numbers', 'Dots', 'Animals'];
    } catch (error) {
        console.error('Error fetching tile sets:', error);
        // Fallback to common tile sets if API fails completely
        return ['Letters', 'Numbers', 'Dots', 'Animals'];
    }
}

/**
 * Populate a tile set select dropdown with available tile sets
 */
async function populateTileSetSelect(selectElement, selectedValue = 'Letters') {
    if (!selectElement) {
        console.error('populateTileSetSelect: selectElement is null');
        return;
    }
    
    try {
        let tileSets = await getAvailableTileSets();
        
        if (!Array.isArray(tileSets) || tileSets.length === 0) {
            console.error('No tile sets available');
            tileSets = ['Letters']; // Emergency fallback
        }
        
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
        
        console.log('Tile sets populated:', tileSets, 'Selected:', selectElement.value);
    } catch (error) {
        console.error('Error in populateTileSetSelect:', error);
        // Emergency fallback - add at least one option
        selectElement.innerHTML = '<option value="Letters">Letters</option>';
        selectElement.value = 'Letters';
    }
}
