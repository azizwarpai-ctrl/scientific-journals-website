-- DropIndex
DROP INDEX `email_templates_name_idx` ON `email_templates`;

-- CreateTable
CREATE TABLE `pricing_plans` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `features` JSON NULL,
    `stripe_price_id` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pricing_plans_stripe_price_id_key`(`stripe_price_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `admin_user_id` BIGINT NOT NULL,
    `pricing_plan_id` BIGINT NOT NULL,
    `stripe_customer_id` VARCHAR(255) NOT NULL,
    `stripe_subscription_id` VARCHAR(255) NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `current_period_end` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `subscriptions_admin_user_id_key`(`admin_user_id`),
    UNIQUE INDEX `subscriptions_stripe_customer_id_key`(`stripe_customer_id`),
    UNIQUE INDEX `subscriptions_stripe_subscription_id_key`(`stripe_subscription_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `subscription_id` BIGINT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `stripe_invoice_id` VARCHAR(255) NOT NULL,
    `invoice_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoices_stripe_invoice_id_key`(`stripe_invoice_id`),
    INDEX `invoices_subscription_id_idx`(`subscription_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_admin_user_id_fkey` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_pricing_plan_id_fkey` FOREIGN KEY (`pricing_plan_id`) REFERENCES `pricing_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
