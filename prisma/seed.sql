-- Direct SQL seed for DigitoPub.com
-- This bypasses Prisma client initialization issues
-- Run with: docker exec -i scientific_journals_db mysql -u app_user -papppassword scientific_journals < prisma/seed.sql

USE scientific_journals;

-- Create admin user with bcrypt password for "admin123"
INSERT INTO admin_users (email, full_name, role, password_hash, created_at, updated_at)
VALUES (
  'admin@digitopub.com',
  'DigitoPub Admin',
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
  password_hash = VALUES(password_hash),
  updated_at = NOW();

SELECT 'Admin user created/updated successfully!' AS message;
SELECT id, email, full_name, role FROM admin_users WHERE email = 'admin@digitopub.com';
