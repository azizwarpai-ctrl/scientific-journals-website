-- CreateTable
CREATE TABLE `admin_users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'admin',
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `country` VARCHAR(90) NULL,
    `phone` VARCHAR(32) NULL,
    `affiliation` VARCHAR(255) NULL,
    `department` VARCHAR(255) NULL,
    `orcid` VARCHAR(255) NULL,
    `biography` TEXT NULL,

    INDEX `admin_users_email_idx`(`email` ASC),
    UNIQUE INDEX `admin_users_email_key`(`email` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `template_id` BIGINT NULL,
    `to_email` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(500) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `error_message` TEXT NULL,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_logs_status_idx`(`status` ASC),
    INDEX `email_logs_template_id_idx`(`template_id` ASC),
    INDEX `email_logs_to_email_idx`(`to_email` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_templates` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `subject` VARCHAR(500) NOT NULL,
    `html_content` LONGTEXT NOT NULL,
    `text_content` LONGTEXT NULL,
    `variables` JSON NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_templates_is_active_idx`(`is_active` ASC),
    INDEX `email_templates_name_idx`(`name` ASC),
    UNIQUE INDEX `email_templates_name_key`(`name` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faq_solutions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `question` TEXT NOT NULL,
    `answer` TEXT NOT NULL,
    `category` VARCHAR(100) NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `helpful_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` TEXT NOT NULL,
    `abbreviation` VARCHAR(100) NULL,
    `issn` VARCHAR(20) NULL,
    `e_issn` VARCHAR(20) NULL,
    `description` TEXT NULL,
    `field` VARCHAR(100) NOT NULL,
    `publisher` VARCHAR(255) NULL,
    `editor_in_chief` VARCHAR(255) NULL,
    `frequency` VARCHAR(50) NULL,
    `submission_fee` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `publication_fee` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `cover_image_url` VARCHAR(500) NULL,
    `website_url` VARCHAR(500) NULL,
    `status` VARCHAR(20) NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by` BIGINT NULL,
    `ojs_id` VARCHAR(50) NULL,
    `ojs_path` VARCHAR(100) NULL,

    INDEX `journals_created_by_fkey`(`created_by` ASC),
    INDEX `journals_field_idx`(`field` ASC),
    INDEX `journals_issn_idx`(`issn` ASC),
    UNIQUE INDEX `journals_issn_key`(`issn` ASC),
    INDEX `journals_ojs_id_idx`(`ojs_id` ASC),
    UNIQUE INDEX `journals_ojs_id_key`(`ojs_id` ASC),
    INDEX `journals_status_idx`(`status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `message_type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'unread',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ojs_sso_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(128) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ojs_sso_tokens_email_idx`(`email` ASC),
    INDEX `ojs_sso_tokens_token_idx`(`token` ASC),
    UNIQUE INDEX `ojs_sso_tokens_token_key`(`token` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `published_articles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `submission_id` BIGINT NOT NULL,
    `journal_id` BIGINT NOT NULL,
    `doi` VARCHAR(255) NULL,
    `volume` INTEGER NULL,
    `issue` INTEGER NULL,
    `page_start` INTEGER NULL,
    `page_end` INTEGER NULL,
    `publication_date` DATE NOT NULL,
    `pdf_url` VARCHAR(500) NULL,
    `html_url` VARCHAR(500) NULL,
    `views_count` INTEGER NULL DEFAULT 0,
    `downloads_count` INTEGER NULL DEFAULT 0,
    `citations_count` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `published_by` BIGINT NULL,
    `ojs_publication_id` VARCHAR(50) NULL,

    INDEX `published_articles_doi_idx`(`doi` ASC),
    UNIQUE INDEX `published_articles_doi_key`(`doi` ASC),
    INDEX `published_articles_journal_id_idx`(`journal_id` ASC),
    INDEX `published_articles_ojs_publication_id_idx`(`ojs_publication_id` ASC),
    UNIQUE INDEX `published_articles_ojs_publication_id_key`(`ojs_publication_id` ASC),
    INDEX `published_articles_publication_date_idx`(`publication_date` ASC),
    INDEX `published_articles_published_by_fkey`(`published_by` ASC),
    INDEX `published_articles_submission_id_fkey`(`submission_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `submission_id` BIGINT NOT NULL,
    `reviewer_name` VARCHAR(255) NOT NULL,
    `reviewer_email` VARCHAR(255) NOT NULL,
    `reviewer_affiliation` VARCHAR(255) NULL,
    `review_status` VARCHAR(50) NULL DEFAULT 'pending',
    `recommendation` VARCHAR(50) NULL,
    `comments_to_author` TEXT NULL,
    `comments_to_editor` TEXT NULL,
    `review_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assigned_by` BIGINT NULL,

    INDEX `reviews_assigned_by_fkey`(`assigned_by` ASC),
    INDEX `reviews_review_status_idx`(`review_status` ASC),
    INDEX `reviews_reviewer_email_idx`(`reviewer_email` ASC),
    INDEX `reviews_submission_id_idx`(`submission_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `submissions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `journal_id` BIGINT NOT NULL,
    `manuscript_title` TEXT NOT NULL,
    `abstract` TEXT NOT NULL,
    `keywords` JSON NULL,
    `submission_type` VARCHAR(50) NULL,
    `author_name` VARCHAR(255) NOT NULL,
    `author_email` VARCHAR(255) NOT NULL,
    `corresponding_author_name` VARCHAR(255) NULL,
    `corresponding_author_email` VARCHAR(255) NULL,
    `co_authors` JSON NULL,
    `manuscript_file_url` VARCHAR(500) NULL,
    `supplementary_files` JSON NULL,
    `status` VARCHAR(50) NULL DEFAULT 'submitted',
    `submission_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_updated` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assigned_to` BIGINT NULL,
    `notes` TEXT NULL,
    `created_by` BIGINT NULL,
    `ojs_submission_id` VARCHAR(50) NULL,

    INDEX `submissions_assigned_to_fkey`(`assigned_to` ASC),
    INDEX `submissions_author_email_idx`(`author_email` ASC),
    INDEX `submissions_created_by_fkey`(`created_by` ASC),
    INDEX `submissions_journal_id_idx`(`journal_id` ASC),
    INDEX `submissions_ojs_submission_id_idx`(`ojs_submission_id` ASC),
    UNIQUE INDEX `submissions_ojs_submission_id_key`(`ojs_submission_id` ASC),
    INDEX `submissions_status_idx`(`status` ASC),
    INDEX `submissions_submission_date_idx`(`submission_date` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(255) NOT NULL,
    `setting_value` JSON NOT NULL,
    `description` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by` BIGINT NULL,

    INDEX `system_settings_setting_key_idx`(`setting_key` ASC),
    UNIQUE INDEX `system_settings_setting_key_key`(`setting_key` ASC),
    INDEX `system_settings_updated_by_fkey`(`updated_by` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_codes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `last_failed_at` DATETIME(3) NULL,
    `locked_until` DATETIME(3) NULL,

    INDEX `verification_codes_code_idx`(`code` ASC),
    INDEX `verification_codes_email_idx`(`email` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `email_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journals` ADD CONSTRAINT `journals_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `published_articles` ADD CONSTRAINT `published_articles_journal_id_fkey` FOREIGN KEY (`journal_id`) REFERENCES `journals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `published_articles` ADD CONSTRAINT `published_articles_published_by_fkey` FOREIGN KEY (`published_by`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `published_articles` ADD CONSTRAINT `published_articles_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_journal_id_fkey` FOREIGN KEY (`journal_id`) REFERENCES `journals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

