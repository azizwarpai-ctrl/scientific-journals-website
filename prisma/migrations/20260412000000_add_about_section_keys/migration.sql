-- AlterTable
ALTER TABLE `about_sections` ADD COLUMN `section_key` VARCHAR(50) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `about_sections_section_key_key` ON `about_sections`(`section_key`);
