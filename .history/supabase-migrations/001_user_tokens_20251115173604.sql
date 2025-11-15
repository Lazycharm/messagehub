-- Migration: Add user_tokens table for credit system
-- Created: November 15, 2025

-- ============================================
-- USER_TOKENS TABLE
-- Stores token/credit balance for each user
-- ============================================
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_user_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_tokens_updated_at
  BEFORE UPDATE ON user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tokens_updated_at();

-- Function to initialize tokens for new users
CREATE OR REPLACE FUNCTION initialize_user_tokens()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_tokens (user_id, balance)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create tokens when user is created
CREATE TRIGGER auto_initialize_user_tokens
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_tokens();

-- Add role column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent'));
  END IF;
END $$;

-- Update existing users to have tokens
INSERT INTO user_tokens (user_id, balance)
SELECT id, 100 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'User tokens table created successfully!';
  RAISE NOTICE 'All existing users have been granted 100 initial tokens';
  RAISE NOTICE 'New users will automatically receive 100 tokens';
END $$;
