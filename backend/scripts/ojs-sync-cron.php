#!/usr/bin/env php
<?php

require __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Bootstrap container
$container = require __DIR__ . '/../src/bootstrap.php';

use App\Application\Services\OJSSyncService;

echo "[" . date('Y-m-d H:i:s') . "] Starting OJS sync...\n";

try {
    /** @var OJSSyncService $syncService */
    $syncService = $container->get(OJSSyncService::class);
    
    $results = $syncService->syncAll();
    
    echo "✅ Synced {$results['submissions']} submissions\n";
    echo "✅ Synced {$results['reviews']} reviews\n";
    echo "✅ Synced {$results['articles']} published articles\n";
    echo "✅ Synced {$results['journals']} journals\n";
    
    echo "[" . date('Y-m-d H:i:s') . "] OJS sync completed successfully\n";
    
} catch (Exception $e) {
    echo "❌ [ERROR] " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    
    // TODO: Send notification email to admin
    exit(1);
}
