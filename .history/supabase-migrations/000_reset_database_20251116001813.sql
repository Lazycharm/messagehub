-- ============================================
-- RESET DATABASE - Use with caution!
-- This will drop all existing tables and start fresh
-- Created: November 16, 2025
-- ============================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS user_chatrooms CASCADE;
DROP TABLE IF EXISTS user_tokens CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS inbound_messages CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS sender_numbers CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS user_tokens_updated_at ON user_tokens CASCADE;
DROP TRIGGER IF EXISTS auto_initialize_user_tokens ON users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_user_tokens_updated_at() CASCADE;
DROP FUNCTION IF EXISTS initialize_user_tokens() CASCADE;

-- Note: We don't drop the users table as it's managed by Supabase Auth
-- But we can reset the role column

-- Reset users table - remove role column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users DROP COLUMN role;
  END IF;
END $$;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database reset complete!';
  RAISE NOTICE 'All tables have been dropped.';
  RAISE NOTICE 'Now run the migration scripts in order:';
  RAISE NOTICE '1. 001_complete_schema.sql';
  RAISE NOTICE '========================================';
END $$;
