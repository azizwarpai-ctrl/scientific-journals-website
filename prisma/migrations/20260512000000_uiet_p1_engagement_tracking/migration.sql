-- UIET-P1 — ORCID public-user identity, engagement tracking, OA-aware PDF gating
-- See specs/UIET-P1/data-model.md for the design rationale.

-- CreateTable
CREATE TABLE `user_event` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orcid` VARCHAR(19) NULL,
    `ip_hash` CHAR(64) NULL,
    `ua_hash` CHAR(64) NULL,
    `article_id` BIGINT NOT NULL,
    `journal_id` BIGINT NOT NULL,
    `galley_id` BIGINT NULL,
    `event_type` VARCHAR(32) NOT NULL,
    `source` VARCHAR(32) NOT NULL,
    `citation_format` VARCHAR(16) NULL,
    `event_meta` JSON NULL,
    `dedup_key` CHAR(64) NOT NULL,
    `view_day` CHAR(10) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_event_orcid_created_at_idx` (`orcid`, `created_at`),
    INDEX `user_event_article_id_event_type_created_at_idx` (`article_id`, `event_type`, `created_at`),
    INDEX `user_event_created_at_idx` (`created_at`),
    UNIQUE INDEX `uq_user_event_view_dedup` (`article_id`, `event_type`, `dedup_key`, `view_day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metrics_article_daily` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `article_id` BIGINT NOT NULL,
    `journal_id` BIGINT NOT NULL,
    `day` CHAR(10) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `unique_views` INTEGER NOT NULL DEFAULT 0,
    `downloads` INTEGER NOT NULL DEFAULT 0,
    `unique_downloads` INTEGER NOT NULL DEFAULT 0,
    `citations` INTEGER NOT NULL DEFAULT 0,
    `source` VARCHAR(32) NOT NULL DEFAULT 'digitopub',
    `computed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `metrics_article_daily_journal_id_day_idx` (`journal_id`, `day`),
    INDEX `metrics_article_daily_day_idx` (`day`),
    UNIQUE INDEX `uq_daily_article_day_source` (`article_id`, `day`, `source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metrics_article_monthly` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `article_id` BIGINT NOT NULL,
    `journal_id` BIGINT NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `unique_views` INTEGER NOT NULL DEFAULT 0,
    `downloads` INTEGER NOT NULL DEFAULT 0,
    `unique_downloads` INTEGER NOT NULL DEFAULT 0,
    `citations` INTEGER NOT NULL DEFAULT 0,
    `source` VARCHAR(32) NOT NULL DEFAULT 'digitopub',
    `computed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `metrics_article_monthly_journal_id_year_month_idx` (`journal_id`, `year`, `month`),
    INDEX `metrics_article_monthly_year_month_idx` (`year`, `month`),
    UNIQUE INDEX `uq_monthly_article_year_month_source` (`article_id`, `year`, `month`, `source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_metrics` (
    `orcid` VARCHAR(19) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `downloads` INTEGER NOT NULL DEFAULT 0,
    `citations` INTEGER NOT NULL DEFAULT 0,
    `first_seen_at` DATETIME(3) NOT NULL,
    `last_event_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_metrics_last_event_at_idx` (`last_event_at`),
    PRIMARY KEY (`orcid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `revoked_orcids` (
    `orcid` VARCHAR(19) NOT NULL,
    `revoked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cookie_iat_min` INTEGER NOT NULL,

    PRIMARY KEY (`orcid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_orcid_links` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `orcid` VARCHAR(19) NOT NULL,
    `ojs_user_id` BIGINT NOT NULL,
    `email_hash` CHAR(64) NULL,
    `linked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `link_source` VARCHAR(32) NOT NULL,
    `ojs_backfilled` BOOLEAN NOT NULL DEFAULT false,

    INDEX `user_orcid_links_ojs_user_id_idx` (`ojs_user_id`),
    UNIQUE INDEX `user_orcid_links_orcid_key` (`orcid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_ojs_writes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `request_id` VARCHAR(36) NOT NULL,
    `orcid` VARCHAR(19) NOT NULL,
    `ojs_user_id` BIGINT NOT NULL,
    `ojs_table` VARCHAR(64) NOT NULL,
    `ojs_column_set` TEXT NOT NULL,
    `planned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `success` BOOLEAN NULL,
    `resolved_at` DATETIME(3) NULL,
    `error` TEXT NULL,
    `reason` VARCHAR(64) NOT NULL,

    INDEX `audit_ojs_writes_orcid_idx` (`orcid`),
    INDEX `audit_ojs_writes_ojs_user_id_idx` (`ojs_user_id`),
    INDEX `audit_ojs_writes_planned_at_idx` (`planned_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
