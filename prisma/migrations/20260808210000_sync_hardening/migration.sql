-- Additive-only migration: sync observability + OJS aggregate snapshots.
-- No existing tables or columns are modified or dropped.

ALTER TABLE `journals` ADD COLUMN `last_synced_at` DATETIME(3) NULL;

CREATE TABLE `sync_runs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `job_name` VARCHAR(100) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'running',
    `triggered_by` VARCHAR(20) NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `stats` JSON NULL,
    `error` TEXT NULL,

    INDEX `sync_runs_job_name_started_at_idx`(`job_name`, `started_at`),
    INDEX `sync_runs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ojs_journal_snapshots` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `journal_id` BIGINT NOT NULL,
    `article_count` INTEGER NOT NULL DEFAULT 0,
    `issue_count` INTEGER NOT NULL DEFAULT 0,
    `latest_publication_at` DATETIME(3) NULL,
    `views_total` BIGINT NOT NULL DEFAULT 0,
    `downloads_total` BIGINT NOT NULL DEFAULT 0,
    `captured_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ojs_journal_snapshots_journal_id_key`(`journal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ojs_journal_snapshots` ADD CONSTRAINT `ojs_journal_snapshots_journal_id_fkey` FOREIGN KEY (`journal_id`) REFERENCES `journals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
