-- MySQL Migration Script
-- Converts PostgreSQL schema to MySQL-compatible schema
-- Version: 1.0
-- Date: 2026-01-10

-- Create database with UTF-8 support
CREATE DATABASE IF NOT EXISTS scientific_journals 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE scientific_journals;

-- =====================================================
-- ADMIN USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin' 
    CHECK (role IN ('admin', 'super_admin')),
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_admin_email (email),
  INDEX idx_admin_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- JOURNALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS journals (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title TEXT NOT NULL,
  abbreviation VARCHAR(100),
  issn VARCHAR(20) UNIQUE,
  e_issn VARCHAR(20),
  description TEXT,
  field VARCHAR(100) NOT NULL,
  publisher VARCHAR(255),
  editor_in_chief VARCHAR(255),
  frequency VARCHAR(50),
  submission_fee DECIMAL(10, 2) DEFAULT 0,
  publication_fee DECIMAL(10, 2) DEFAULT 0,
  cover_image_url VARCHAR(500),
  website_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT,
  ojs_id VARCHAR(50) UNIQUE COMMENT 'Reference to OJS journal_id for sync',
  
  INDEX idx_journals_field (field),
  INDEX idx_journals_status (status),
  INDEX idx_journals_issn (issn),
  INDEX idx_journals_ojs_id (ojs_id),
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SUBMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS submissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  journal_id BIGINT NOT NULL,
  manuscript_title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  keywords JSON COMMENT 'Array of keywords stored as JSON',
  submission_type VARCHAR(50) 
    CHECK (submission_type IN ('original_research', 'review', 'case_report', 'short_communication', 'letter')),
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  corresponding_author_name VARCHAR(255),
  corresponding_author_email VARCHAR(255),
  co_authors JSON COMMENT 'Array of co-author objects stored as JSON',
  manuscript_file_url VARCHAR(500),
  supplementary_files JSON COMMENT 'Array of supplementary file objects stored as JSON',
  status VARCHAR(50) DEFAULT 'submitted' 
    CHECK (status IN ('submitted', 'under_review', 'revision_required', 'accepted', 'rejected', 'published')),
  submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  assigned_to BIGINT,
  notes TEXT,
  created_by BIGINT,
  ojs_submission_id VARCHAR(50) UNIQUE COMMENT 'Reference to OJS submission_id for sync',
  
  INDEX idx_submissions_journal_id (journal_id),
  INDEX idx_submissions_status (status),
  INDEX idx_submissions_author_email (author_email),
  INDEX idx_submissions_submission_date (submission_date),
  INDEX idx_submissions_ojs_id (ojs_submission_id),
  FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- REVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  submission_id BIGINT NOT NULL,
  reviewer_name VARCHAR(255) NOT NULL,
  reviewer_email VARCHAR(255) NOT NULL,
  reviewer_affiliation VARCHAR(255),
  review_status VARCHAR(50) DEFAULT 'pending' 
    CHECK (review_status IN ('pending', 'in_progress', 'completed', 'declined')),
  recommendation VARCHAR(50) 
    CHECK (recommendation IN ('accept', 'minor_revision', 'major_revision', 'reject')),
  comments_to_author TEXT,
  comments_to_editor TEXT,
  review_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  assigned_by BIGINT,
  
  INDEX idx_reviews_submission_id (submission_id),
  INDEX idx_reviews_status (review_status),
  INDEX idx_reviews_reviewer_email (reviewer_email),
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PUBLISHED ARTICLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS published_articles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  submission_id BIGINT NOT NULL,
  journal_id BIGINT NOT NULL,
  doi VARCHAR(255) UNIQUE,
  volume INT,
  issue INT,
  page_start INT,
  page_end INT,
  publication_date DATE NOT NULL,
  pdf_url VARCHAR(500),
  html_url VARCHAR(500),
  views_count INT DEFAULT 0,
  downloads_count INT DEFAULT 0,
  citations_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_by BIGINT,
  ojs_publication_id VARCHAR(50) UNIQUE COMMENT 'Reference to OJS publication_id for sync',
  
  INDEX idx_published_articles_journal_id (journal_id),
  INDEX idx_published_articles_doi (doi),
  INDEX idx_published_articles_publication_date (publication_date),
  INDEX idx_published_articles_ojs_id (ojs_publication_id),
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE,
  FOREIGN KEY (published_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSON NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by BIGINT,
  
  INDEX idx_settings_key (setting_key),
  FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- Note: MySQL doesn't need explicit triggers for updated_at
-- when using ON UPDATE CURRENT_TIMESTAMP in column definition
-- These are kept for compatibility/explicit control if needed
-- =====================================================

DELIMITER $$

-- Admin Users Update Trigger (redundant but explicit)
CREATE TRIGGER trg_admin_users_updated_at 
BEFORE UPDATE ON admin_users
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

-- Journals Update Trigger (redundant but explicit)
CREATE TRIGGER trg_journals_updated_at 
BEFORE UPDATE ON journals
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$

-- Submissions Update Trigger (redundant but explicit)
CREATE TRIGGER trg_submissions_updated_at 
BEFORE UPDATE ON submissions
FOR EACH ROW
BEGIN
    SET NEW.last_updated = CURRENT_TIMESTAMP;
END$$

DELIMITER ;

-- =====================================================
-- INSERT INITIAL SYSTEM SETTINGS
-- =====================================================
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('site_name', '"DigitoPub.com"', 'Name of the platform'),
  ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
  ('allowed_file_types', '["pdf", "doc", "docx", "txt"]', 'Allowed file types for submissions'),
  ('max_file_size_mb', '50', 'Maximum file size in MB for uploads'),
  ('ojs_sync_enabled', 'true', 'Enable/disable OJS database synchronization'),
  ('ojs_last_sync', 'null', 'Timestamp of last successful OJS sync')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- =====================================================
-- CREATE READ-ONLY USER (FOR APPLICATION USE)
-- This user should be created separately for security
-- Commented out for manual execution
-- =====================================================
-- CREATE USER 'app_readonly'@'localhost' IDENTIFIED BY 'secure_password_here';
-- GRANT SELECT ON scientific_journals.* TO 'app_readonly'@'localhost';
-- FLUSH PRIVILEGES;

-- =====================================================
-- NOTES ON MIGRATION FROM POSTGRESQL
-- =====================================================
-- 1. UUID columns changed to BIGINT AUTO_INCREMENT
-- 2. JSONB changed to JSON
-- 3. TEXT[] arrays changed to JSON arrays
-- 4. TIMESTAMPTZ changed to DATETIME
-- 5. Row Level Security removed - implement in application layer
-- 6. Auth schema references removed - using separate created_by fields
-- 7. Added ojs_id columns for OJS database sync tracking
-- 8. Check constraints added where appropriate
-- 9. All indexes recreated for MySQL optimization
