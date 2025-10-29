-- Drop the table if it exists to start fresh
DROP TABLE IF EXISTS public.community_discussions CASCADE;

-- Create community_discussions table with nullable user_id
CREATE TABLE public.community_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_discussions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Discussions are viewable by everyone" 
ON public.community_discussions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own discussions" 
ON public.community_discussions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discussions" 
ON public.community_discussions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discussions" 
ON public.community_discussions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_community_discussions_updated_at
BEFORE UPDATE ON public.community_discussions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_community_discussions_category ON public.community_discussions(category);
CREATE INDEX idx_community_discussions_created_at ON public.community_discussions(created_at DESC);

-- Seed sample discussions with NULL user_id for demo purposes
INSERT INTO public.community_discussions (user_id, title, content, category, views, reply_count, created_at) VALUES
(NULL, 'Best areas for BTL investments in 2025?', 'I''m looking to expand my portfolio and would love to hear your thoughts on which UK areas offer the best buy-to-let opportunities this year. I''m particularly interested in areas with strong rental demand and good capital growth potential.', 'Market Insights', 142, 23, now() - interval '2 days'),
(NULL, 'HMO licensing - what you need to know', 'Just went through the HMO licensing process in Birmingham and thought I''d share my experience. The process took about 8 weeks and cost £1,100. Happy to answer any questions!', 'Property Management', 89, 12, now() - interval '5 days'),
(NULL, 'Achieved 12% ROI on my first deal!', 'Finally completed on my first investment property and wanted to share the journey. Bought a 2-bed flat in Manchester for £165k, now renting for £1,100 pcm. Total ROI of 12% including capital appreciation. AMA!', 'Success Stories', 256, 45, now() - interval '1 day'),
(NULL, 'SDLT changes - how are you adapting?', 'With the recent stamp duty changes, how is everyone adjusting their investment strategies? Are you still finding deals that work with the higher SDLT rates?', 'Tax & Legal', 178, 31, now() - interval '3 days'),
(NULL, 'Best mortgage brokers for portfolio landlords?', 'Looking for recommendations for mortgage brokers who specialize in portfolio landlords. I currently have 6 properties and finding it harder to get good rates. Any suggestions?', 'Financing', 134, 19, now() - interval '4 days'),
(NULL, 'Using AI tools for property analysis', 'Has anyone experimented with AI tools for analyzing potential deals? I''ve been using some automation for market research and it''s been a game-changer. Would love to hear your experiences.', 'General Discussion', 203, 28, now() - interval '6 hours'),
(NULL, 'Off-market deal sourcing strategies', 'What are your go-to strategies for finding off-market deals? I''ve had success with direct mail campaigns and networking with local agents. Curious what else is working in 2025.', 'Deal Analysis', 167, 22, now() - interval '1 day'),
(NULL, 'Student accommodation vs. traditional BTL', 'Considering pivoting from traditional BTL to student accommodation. The yields look attractive but concerned about void periods and management intensity. Anyone made this switch?', 'Deal Analysis', 112, 15, now() - interval '8 hours');