-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin_users table for admin authentication
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create journals table
CREATE TABLE IF NOT EXISTS public.journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  abbreviation TEXT,
  issn TEXT UNIQUE,
  e_issn TEXT,
  description TEXT,
  field TEXT NOT NULL,
  publisher TEXT,
  editor_in_chief TEXT,
  frequency TEXT,
  submission_fee DECIMAL(10, 2) DEFAULT 0,
  publication_fee DECIMAL(10, 2) DEFAULT 0,
  cover_image_url TEXT,
  website_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.admin_users(id)
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  manuscript_title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  keywords TEXT[],
  submission_type TEXT CHECK (submission_type IN ('original_research', 'review', 'case_report', 'short_communication', 'letter')),
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  corresponding_author_name TEXT,
  corresponding_author_email TEXT,
  co_authors JSONB,
  manuscript_file_url TEXT,
  supplementary_files JSONB,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'revision_required', 'accepted', 'rejected', 'published')),
  submission_date TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  assigned_to UUID REFERENCES public.admin_users(id),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  reviewer_affiliation TEXT,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'in_progress', 'completed', 'declined')),
  recommendation TEXT CHECK (recommendation IN ('accept', 'minor_revision', 'major_revision', 'reject')),
  comments_to_author TEXT,
  comments_to_editor TEXT,
  review_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.admin_users(id)
);

-- Create published_articles table
CREATE TABLE IF NOT EXISTS public.published_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  doi TEXT UNIQUE,
  volume INTEGER,
  issue INTEGER,
  page_start INTEGER,
  page_end INTEGER,
  publication_date DATE NOT NULL,
  pdf_url TEXT,
  html_url TEXT,
  views_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  citations_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_by UUID REFERENCES public.admin_users(id)
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.admin_users(id)
);

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users (admins can manage their own profile)
CREATE POLICY "Admins can view their own profile" ON public.admin_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can update their own profile" ON public.admin_users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for journals (admins can manage journals)
CREATE POLICY "Admins can view all journals" ON public.journals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can insert journals" ON public.journals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update journals" ON public.journals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can delete journals" ON public.journals
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- RLS Policies for submissions (admins can view and manage all submissions)
CREATE POLICY "Admins can view all submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can insert submissions" ON public.submissions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update submissions" ON public.submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can delete submissions" ON public.submissions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- RLS Policies for reviews
CREATE POLICY "Admins can view all reviews" ON public.reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage reviews" ON public.reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- RLS Policies for published_articles
CREATE POLICY "Admins can view all articles" ON public.published_articles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage articles" ON public.published_articles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- RLS Policies for system_settings
CREATE POLICY "Admins can view settings" ON public.system_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

CREATE POLICY "Super admins can manage settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Create indexes for better performance
CREATE INDEX idx_journals_field ON public.journals(field);
CREATE INDEX idx_journals_status ON public.journals(status);
CREATE INDEX idx_submissions_journal_id ON public.submissions(journal_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_submissions_author_email ON public.submissions(author_email);
CREATE INDEX idx_reviews_submission_id ON public.reviews(submission_id);
CREATE INDEX idx_published_articles_journal_id ON public.published_articles(journal_id);
CREATE INDEX idx_published_articles_doi ON public.published_articles(doi);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journals_updated_at BEFORE UPDATE ON public.journals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
