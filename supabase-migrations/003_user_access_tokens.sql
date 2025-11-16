-- User Tokens/Access Management Schema
-- This replaces the token balance system with an access token system

-- Create user_tokens table for access management
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT UNIQUE NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_access_token ON user_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_user_tokens_is_approved ON user_tokens(is_approved);

-- Enable RLS
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access" ON user_tokens;
DROP POLICY IF EXISTS "Users can view their own tokens" ON user_tokens;
DROP POLICY IF EXISTS "Admins can manage all tokens" ON user_tokens;

CREATE POLICY "Service role full access" ON user_tokens
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their own tokens" ON user_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::uuid);

CREATE POLICY "Admins can manage all tokens" ON user_tokens
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::uuid 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()::uuid 
      AND users.role = 'admin'
    )
  );

-- Add approval status to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Function to generate random access token
CREATE OR REPLACE FUNCTION generate_access_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 8-character token (e.g., ABC12XYZ)
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create token when user is created
CREATE OR REPLACE FUNCTION auto_create_user_token()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_tokens (user_id, access_token, is_approved)
  VALUES (NEW.id, generate_access_token(), NEW.is_approved);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS auto_create_user_token_trigger ON users;

CREATE TRIGGER auto_create_user_token_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_user_token();

-- Update existing users to have tokens
INSERT INTO user_tokens (user_id, access_token, is_approved)
SELECT 
  id, 
  generate_access_token(),
  COALESCE(is_approved, true)
FROM users
WHERE id NOT IN (SELECT user_id FROM user_tokens WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;
