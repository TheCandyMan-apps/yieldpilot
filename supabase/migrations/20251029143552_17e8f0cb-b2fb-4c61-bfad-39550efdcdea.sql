-- Add missing columns to user_activity table
ALTER TABLE user_activity 
ADD COLUMN IF NOT EXISTS action text,
ADD COLUMN IF NOT EXISTS resource_type text,
ADD COLUMN IF NOT EXISTS resource_id uuid;

-- Update existing records to copy action_type to action if needed
UPDATE user_activity 
SET action = action_type 
WHERE action IS NULL AND action_type IS NOT NULL;

-- Add check constraint for resource_type
ALTER TABLE user_activity 
ADD CONSTRAINT user_activity_resource_type_check 
CHECK (resource_type IN ('deal', 'forecast', 'export', 'payment', 'portfolio', 'search'));