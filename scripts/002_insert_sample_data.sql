-- Insert sample journals
INSERT INTO public.journals (title, abbreviation, issn, e_issn, description, field, publisher, editor_in_chief, frequency, cover_image_url, status)
VALUES
  ('Journal of Advanced Medicine', 'J Adv Med', '2234-5678', '2234-5679', 'A leading journal in medical research', 'Medicine', 'Medical Publishing House', 'Dr. Sarah Johnson', 'Monthly', '/images/imegjournal.jpg', 'active'),
  ('International Journal of Technology Research', 'Int J Tech Res', '3345-6789', '3345-6790', 'Cutting-edge technology research', 'Technology', 'Tech Publishers Inc', 'Prof. Michael Chen', 'Quarterly', '/images/1.png', 'active'),
  ('Journal of Dental Science', 'J Dent Sci', '4456-7890', '4456-7891', 'Comprehensive dental research', 'Dentistry', 'Dental Academic Press', 'Dr. Emily White', 'Bi-monthly', '/images/4.jpg', 'active'),
  ('Journal of Computerized Dentistry', 'J Comput Dent', '5567-8901', '5567-8902', 'Digital dentistry innovations', 'Dentistry', 'Digital Health Publications', 'Dr. Robert Brown', 'Quarterly', '/images/2.png', 'active')
ON CONFLICT (issn) DO NOTHING;
