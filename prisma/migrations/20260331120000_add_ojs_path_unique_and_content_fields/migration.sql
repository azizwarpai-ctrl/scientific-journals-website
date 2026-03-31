-- Deduplicate existing ojs_path before creating unique index
UPDATE journals j1
JOIN journals j2 ON j1.ojs_path = j2.ojs_path AND j1.id > j2.id
SET j1.ojs_path = NULL
WHERE j1.ojs_path IS NOT NULL;

-- AlterTable
ALTER TABLE `journals` ADD COLUMN `aims_and_scope` TEXT NULL,
    ADD COLUMN `author_guidelines` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `journals_ojs_path_key` ON `journals`(`ojs_path`);

