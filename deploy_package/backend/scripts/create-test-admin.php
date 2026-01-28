<?php

require __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Bootstrap container
$container = require __DIR__ . '/../src/bootstrap.php';

use App\Domain\Entities\AdminUser;
use App\Domain\Repositories\AdminUserRepositoryInterface;

echo "Creating test admin user...\n";

$email = "admin@test.com";
$fullName = "Test Admin";
$password = "TestPassword123!";

try {
    /** @var AdminUserRepositoryInterface $repo */
    $repo = $container->get(AdminUserRepositoryInterface::class);

    // Check if exists
    $existing = $repo->findByEmail($email);
    if ($existing) {
        echo "✅ User already exists: $email\n";
        echo "   ID: " . $existing->getId() . "\n";
        echo "   Name: " . $existing->getFullName() . "\n";
        exit(0);
    }

    $admin = AdminUser::create($email, $fullName, $password);
    $saved = $repo->save($admin);

    echo "✅ Admin user created successfully!\n";
    echo "   Email: $email\n";
    echo "   Password: $password\n";
    echo "   ID: " . $saved->getId() . "\n";
    echo "   Name: " . $saved->getFullName() . "\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
