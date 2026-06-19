-- Widen verification_codes.code from VARCHAR(10) to VARCHAR(72).
-- The column was originally sized for a 6-digit plaintext OTP but now
-- stores bcrypt hashes (60 chars). The old width silently truncated
-- every hash, causing verify-code to always return 401.

ALTER TABLE `verification_codes` MODIFY COLUMN `code` VARCHAR(72) NOT NULL;
