-- Add password_hash column to admin_users for direct PostgreSQL authentication

ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Update RLS policies to work with session-based auth
-- (Policies will now check against the user_id passed in queries rather than Supabase auth)
