-- Create enum for property types
CREATE TYPE public.property_type AS ENUM ('residential', 'commercial', 'mixed_use', 'land');

-- Create enum for analysis status
CREATE TYPE public.analysis_status AS ENUM ('pending', 'completed', 'failed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'investor', 'agency')),
  analyses_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create property_analyses table
CREATE TABLE public.property_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_address TEXT NOT NULL,
  property_price DECIMAL(12, 2) NOT NULL,
  property_type public.property_type DEFAULT 'residential',
  estimated_rent DECIMAL(10, 2),
  mortgage_rate DECIMAL(5, 2),
  deposit_amount DECIMAL(12, 2),
  monthly_costs DECIMAL(10, 2),
  roi_percentage DECIMAL(5, 2),
  net_yield_percentage DECIMAL(5, 2),
  cash_flow_monthly DECIMAL(10, 2),
  deal_quality_score INTEGER CHECK (deal_quality_score BETWEEN 0 AND 100),
  ai_commentary TEXT,
  analysis_status public.analysis_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create portfolios table
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_value DECIMAL(15, 2) DEFAULT 0,
  total_roi DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create portfolio_properties junction table
CREATE TABLE public.portfolio_properties (
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.property_analyses(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (portfolio_id, analysis_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_properties ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Property analyses policies
CREATE POLICY "Users can view own analyses"
  ON public.property_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analyses"
  ON public.property_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
  ON public.property_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.property_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Portfolios policies
CREATE POLICY "Users can view own portfolios"
  ON public.portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own portfolios"
  ON public.portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios"
  ON public.portfolios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios"
  ON public.portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- Portfolio properties policies
CREATE POLICY "Users can view own portfolio properties"
  ON public.portfolio_properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_properties.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add to own portfolios"
  ON public.portfolio_properties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_properties.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove from own portfolios"
  ON public.portfolio_properties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = portfolio_properties.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();