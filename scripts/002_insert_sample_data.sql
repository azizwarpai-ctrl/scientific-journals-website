-- MySQL Sample Data Insert
-- Compatible with MySQL schema
-- Version: 1.0

USE scientific_journals;

-- Insert sample journals (compatible with MySQL)
INSERT INTO journals (title, abbreviation, issn, e_issn, description, field, publisher, editor_in_chief, frequency, cover_image_url, status)
VALUES
  ('Journal of Advanced Medicine', 'J Adv Med', '2234-5678', '2234-5679', 'A leading journal in medical research', 'Medicine', 'Medical Publishing House', 'Dr. Sarah Johnson', 'Monthly', '/images/imegjournal.jpg', 'active'),
  ('International Journal of Technology Research', 'Int J Tech Res', '3345-6789', '3345-6790', 'Cutting-edge technology research', 'Technology', 'Tech Publishers Inc', 'Prof. Michael Chen', 'Quarterly', '/images/1.png', 'active'),
  ('Journal of Dental Science', 'J Dent Sci', '4456-7890', '4456-7891', 'Comprehensive dental research', 'Dentistry', 'Dental Academic Press', 'Dr. Emily White', 'Bi-monthly', '/images/4.jpg', 'active'),
  ('Journal of Computerized Dentistry', 'J Comput Dent', '5567-8901', '5567-8902', 'Digital dentistry innovations', 'Dentistry', 'Digital Health Publications', 'Dr. Robert Brown', 'Quarterly', '/images/2.png', 'active')
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Insert sample submissions with JSON fields
INSERT INTO submissions (
  journal_id, 
  manuscript_title, 
  abstract, 
  keywords, 
  submission_type, 
  author_name, 
  author_email,
  co_authors,
  status
)
VALUES
  (
    1,
    'Novel Approaches in Cancer Treatment',
    'This study explores innovative methodologies in cancer treatment using advanced biotechnology.',
    JSON_ARRAY('cancer', 'biotechnology', 'treatment', 'oncology'),
    'original_research',
    'Dr. James Wilson',
    'j.wilson@example.com',
    JSON_ARRAY(
      JSON_OBJECT('name', 'Dr. Maria Garcia', 'email', 'm.garcia@example.com', 'affiliation', 'Stanford University'),
      JSON_OBJECT('name', 'Prof. John Smith', 'email', 'j.smith@example.com', 'affiliation', 'MIT')
    ),
    'under_review'
  ),
  (
    2,
    'Artificial Intelligence in Modern Computing',
    'An exploration of AI applications in cloud computing and edge devices.',
    JSON_ARRAY('artificial intelligence', 'cloud computing', 'machine learning'),
    'review',
    'Prof. Lisa Anderson',
    'l.anderson@example.com',
    JSON_ARRAY(
      JSON_OBJECT('name', 'Dr. Kevin Lee', 'email', 'k.lee@example.com', 'affiliation', 'Google Research')
    ),
    'submitted'
  )
ON DUPLICATE KEY UPDATE manuscript_title = VALUES(manuscript_title);
