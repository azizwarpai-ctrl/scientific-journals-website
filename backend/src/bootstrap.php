<?php

declare(strict_types=1);

use DI\ContainerBuilder;

$containerBuilder = new ContainerBuilder();

// Add definitions
$containerBuilder->addDefinitions([
    // Database configuration will go here
    PDO::class => function () {
        $host = $_ENV['DB_HOST'] ?? 'localhost';
        $port = $_ENV['DB_PORT'] ?? '3306';
        $db   = $_ENV['DB_DATABASE'] ?? 'scientific_journals_db';
        $user = $_ENV['DB_USERNAME'] ?? 'root';
        $pass = $_ENV['DB_PASSWORD'] ?? '';
        $charset = 'utf8mb4';

        $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            return new PDO($dsn, $user, $pass, $options);
        } catch (\PDOException $e) {
            throw new \Exception($e->getMessage(), (int)$e->getCode());
        }
    },

    // Repositories
    \App\Domain\Repositories\AdminUserRepositoryInterface::class => \DI\autowire(\App\Infrastructure\Database\Repositories\PDOAdminUserRepository::class),
    \App\Domain\Repositories\VerificationTokenRepositoryInterface::class => \DI\autowire(\App\Infrastructure\Database\Repositories\PDOVerificationTokenRepository::class),
    \App\Domain\Repositories\FAQRepositoryInterface::class => \DI\autowire(\App\Infrastructure\Database\Repositories\PDOFAQRepository::class),
    \App\Domain\Repositories\MessageRepositoryInterface::class => \DI\autowire(\App\Infrastructure\Database\Repositories\PDOMessageRepository::class),

    // Services
    \App\Infrastructure\Security\JWTService::class => \DI\autowire(),
    \App\Application\Services\OTPService::class => \DI\autowire(),
    \App\Application\Services\EmailService::class => \DI\autowire(\App\Infrastructure\Email\PHPMailerEmailService::class),

    // Use Cases
    \App\Application\UseCases\Auth\LoginUseCase::class => \DI\autowire(),
    \App\Application\UseCases\Auth\VerifyOTPUseCase::class => \DI\autowire(),
    \App\Application\UseCases\Auth\RegisterUserUseCase::class => \DI\autowire(),
    \App\Application\UseCases\Auth\ResendOTPUseCase::class => \DI\autowire(),

    // Controllers
    \App\Presentation\Controllers\AuthController::class => \DI\autowire(),
    \App\Presentation\Controllers\JournalController::class => \DI\autowire(),
    \App\Presentation\Controllers\FAQController::class => \DI\autowire(),
    \App\Presentation\Controllers\MessageController::class => \DI\autowire(),

    // Journal Dependencies
    \App\Domain\Repositories\JournalRepositoryInterface::class => \DI\autowire(\App\Infrastructure\Database\Repositories\PDOJournalRepository::class),
    \App\Application\UseCases\Journal\CreateJournalUseCase::class => \DI\autowire(),
    \App\Application\UseCases\Journal\ListJournalsUseCase::class => \DI\autowire(),
    \App\Application\UseCases\Journal\GetJournalUseCase::class => \DI\autowire(),
    
    // OJS Integration
    \App\Infrastructure\Database\OJSConnection::class => \DI\autowire(),
    \App\Application\Services\OJSSyncService::class => \DI\autowire(),
    \App\Presentation\Controllers\OJSController::class => \DI\autowire(),
]);

try {
    return $containerBuilder->build();
} catch (Exception $e) {
    die("Container build failed: " . $e->getMessage());
}
