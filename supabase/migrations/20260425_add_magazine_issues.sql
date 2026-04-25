-- Create magazine_issues table to store curated magazine content
CREATE TABLE IF NOT EXISTS public.magazine_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_number TEXT UNIQUE NOT NULL,
    published_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    post_a_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    post_b1_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    post_b2_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    post_b3_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.magazine_issues ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read magazine issues" 
ON public.magazine_issues FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage magazine issues" 
ON public.magazine_issues FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Add comments for documentation
COMMENT ON TABLE public.magazine_issues IS 'Stores curated magazine issues with selected posts for the home page banner.';
COMMENT ON COLUMN public.magazine_issues.issue_number IS 'Format like "2026-1", "2026-2"';
