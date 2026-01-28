-- Sample Data

-- Default Admin User (Password: password)
-- Hash generated via standard bcrypt cost 10
INSERT INTO `admin_users` (`email`, `full_name`, `role`, `password_hash`, `two_factor_enabled`, `created_at`, `updated_at`)
VALUES 
('admin@example.com', 'System Admin', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, NOW(), NOW());

-- Sample Journal
INSERT INTO `journals` (`title`, `abbreviation`, `field`, `description`, `status`)
VALUES 
('Journal of Computerized Dentistry', 'JCD', 'Digital Dentistry', 'Focusing on CAD/CAM and digital workflows.', 'active');

-- Sample FAQ
INSERT INTO `faq_solutions` (`question`, `answer`, `category`, `priority`, `is_published`)
VALUES 
('How do I submit a manuscript?', 'You can submit via the Submit Manuscript button on the homepage.', 'Submission', 10, 1);
