<?php

require __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Bootstrap container
$container = require __DIR__ . '/../src/bootstrap.php';

use App\Domain\Entities\AdminUser;
use App\Domain\Repositories\AdminUserRepositoryInterface;

if (php_sapi_name() !== 'cli') {
    die("This script must be run from the command line.");
}

echo "Create New Admin User\n";
echo "=====================\n";

$email = readline("Email: ");
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    die("Invalid email address.\n");
}

$fullName = readline("Full Name: ");
if (empty($fullName)) {
    die("Full Name is required.\n");
}

$password = readline("Password: ");
if (strlen($password) < 8) {
    die("Password must be at least 8 characters.\n");
}

try {
    /** @var AdminUserRepositoryInterface $repo */
    $repo = $container->get(AdminUserRepositoryInterface::class);

    // Check if exists
    if ($repo->findByEmail($email)) {
        die("User with this email already exists.\n");
    }

    $admin = AdminUser::create($email, $fullName, $password);
    $repo->save($admin);

    echo "\nAdmin user created successfully!\n";
} catch (Exception $e) {
    echo "\nError: " . $e->getMessage() . "\n";
}
