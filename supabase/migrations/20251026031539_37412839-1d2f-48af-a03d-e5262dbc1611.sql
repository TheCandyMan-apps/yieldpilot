-- Add default assumptions to profiles table for per-user defaults
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_assumptions JSONB DEFAULT jsonb_build_object(
  'deposit_pct', 25,
  'apr', 5.5,
  'term_years', 25,
  'interest_only', true,
  'voids_pct', 5,
  'maintenance_pct', 8,
  'management_pct', 10,
  'insurance_annual', 300
);

-- Add comment for documentation
COMMENT ON COLUMN profiles.default_assumptions IS 'User default underwriting assumptions (BTL, HMO, or custom presets)';