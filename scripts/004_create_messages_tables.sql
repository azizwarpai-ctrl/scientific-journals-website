-- Create messages table for submission help and technical support
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Message Details
    message_type TEXT NOT NULL CHECK (message_type IN ('submission_help', 'technical_support', 'contact')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Status and Management
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'resolved')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES auth.users(id),
    
    -- Response
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES auth.users(id)
);

-- Create solutions/FAQ table
CREATE TABLE IF NOT EXISTS public.faq_solutions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Content
    category TEXT NOT NULL CHECK (category IN ('submission', 'publication', 'review', 'technical', 'general')),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    
    -- Metadata
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    
    -- Search
    search_keywords TEXT[]
);

-- Create indexes
CREATE INDEX idx_messages_status ON public.messages(status);
CREATE INDEX idx_messages_type ON public.messages(message_type);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_faq_category ON public.faq_solutions(category);
CREATE INDEX idx_faq_published ON public.faq_solutions(is_published);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_solutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Admins can view all messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.id = auth.uid()
        )
    );

CREATE POLICY "Admins can update messages"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert messages"
    ON public.messages FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- RLS Policies for FAQ/Solutions
CREATE POLICY "Anyone can view published FAQ"
    ON public.faq_solutions FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

CREATE POLICY "Admins can view all FAQ"
    ON public.faq_solutions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage FAQ"
    ON public.faq_solutions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.id = auth.uid()
        )
    );

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_solutions_updated_at BEFORE UPDATE ON public.faq_solutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
