-- CreateTable: offers
CREATE TABLE `offers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `price_cents` INTEGER NOT NULL DEFAULT 0,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
    `billing_interval` VARCHAR(20) NOT NULL DEFAULT 'month',
    `features` JSON NOT NULL,
    `icon_key` VARCHAR(100) NULL,
    `image_url` VARCHAR(500) NULL,
    `cta_text` VARCHAR(100) NOT NULL DEFAULT 'Get Started',
    `cta_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `available_from` DATETIME(3) NULL,
    `available_until` DATETIME(3) NULL,
    `pricing_plan_id` BIGINT NULL,
    `journal_id` BIGINT NULL,
    `created_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `offers_slug_key`(`slug`),
    INDEX `offers_is_active_sort_order_idx`(`is_active`, `sort_order`),
    INDEX `offers_journal_id_idx`(`journal_id`),
    INDEX `offers_pricing_plan_id_idx`(`pricing_plan_id`),
    INDEX `offers_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `offers` ADD CONSTRAINT `offers_pricing_plan_id_fkey` FOREIGN KEY (`pricing_plan_id`) REFERENCES `pricing_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `offers` ADD CONSTRAINT `offers_journal_id_fkey` FOREIGN KEY (`journal_id`) REFERENCES `journals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `offers` ADD CONSTRAINT `offers_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
