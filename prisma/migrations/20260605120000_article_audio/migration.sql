-- Initiative B — per-article audio (manager-uploaded)
-- See specs/audio-abstracts/analysis.md for the design rationale.

-- CreateTable
CREATE TABLE `article_audio` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `ojs_journal_id` VARCHAR(50) NOT NULL,
    `submission_id` BIGINT NOT NULL,
    `locale` VARCHAR(14) NOT NULL DEFAULT '',
    `storage_key` VARCHAR(500) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size_bytes` BIGINT NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `duration_seconds` INTEGER NULL,
    `uploaded_by` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `article_audio_ojs_journal_id_submission_id_idx` (`ojs_journal_id`, `submission_id`),
    INDEX `article_audio_uploaded_by_idx` (`uploaded_by`),
    UNIQUE INDEX `uq_article_audio_journal_submission_locale` (`ojs_journal_id`, `submission_id`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `article_audio`
    ADD CONSTRAINT `article_audio_uploaded_by_fkey`
    FOREIGN KEY (`uploaded_by`) REFERENCES `admin_users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
