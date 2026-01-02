<?php
// SameGame API Configuration
// Simple standalone config - can be overridden by environment variables

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: 'localhost',
        'username' => getenv('DB_USER') ?: 'samegame',
        'password' => getenv('DB_PASS') ?: 'samegame123',
        'database' => getenv('DB_NAME') ?: 'samegame'
    ]
];

