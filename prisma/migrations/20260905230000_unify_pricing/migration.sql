-- Migration: unify_pricing
-- Removes the Offer model and enhances PricingPlan with presentation fields.
-- Generated: 2026-09-05

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add presentation fields to pricing_plans
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `pricing_plans`
  ADD COLUMN `slug`              VARCHAR(100)  NULL UNIQUE AFTER `name`,
  ADD COLUMN `short_description` VARCHAR(500)  NULL AFTER `description`,
  ADD COLUMN `currency`          VARCHAR(3)    NOT NULL DEFAULT 'USD' AFTER `price`,
  ADD COLUMN `billing_interval`  VARCHAR(20)   NOT NULL DEFAULT 'one_time' AFTER `currency`,
  ADD COLUMN `icon_key`          VARCHAR(50)   NULL AFTER `features`,
  ADD COLUMN `image_url`         VARCHAR(500)  NULL AFTER `icon_key`,
  ADD COLUMN `cta_label`         VARCHAR(100)  NOT NULL DEFAULT 'Get Started' AFTER `image_url`,
  ADD COLUMN `cta_url`           VARCHAR(500)  NULL AFTER `cta_label`,
  ADD COLUMN `is_featured`       BOOLEAN       NOT NULL DEFAULT FALSE AFTER `is_popular`,
  ADD COLUMN `sort_order`        INT           NOT NULL DEFAULT 0 AFTER `is_featured`,
  ADD COLUMN `available_from`    DATETIME(3)   NULL AFTER `sort_order`,
  ADD COLUMN `available_until`   DATETIME(3)   NULL AFTER `available_from`,
  ADD COLUMN `journal_id`        BIGINT        NULL AFTER `available_until`;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add FK from pricing_plans to journals
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE `pricing_plans`
  ADD CONSTRAINT `pricing_plans_journal_id_fkey`
    FOREIGN KEY (`journal_id`) REFERENCES `journals`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add indexes on pricing_plans
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX `pricing_plans_is_active_sort_order_idx` ON `pricing_plans` (`is_active`, `sort_order`);
CREATE INDEX `pricing_plans_journal_id_idx` ON `pricing_plans` (`journal_id`);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Drop the offers table
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS `offers`;
