-- Migration: User Chatroom Assignments
-- Purpose: Create user_chatrooms table for multi-tenant access control
-- Allows agents to be assigned to specific chatrooms

-- Create user_chatrooms pivot table
CREATE TABLE IF NOT EXISTS user_chatrooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chatroom_id UUID NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate assignments
  UNIQUE(user_id, chatroom_id)
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_user_chatrooms_user_id ON user_chatrooms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chatrooms_chatroom_id ON user_chatrooms(chatroom_id);

-- Add RLS policies for security
ALTER TABLE user_chatrooms ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own chatroom assignments
CREATE POLICY "Users can view their own chatroom assignments"
  ON user_chatrooms FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can manage all assignments
CREATE POLICY "Admins can manage all assignments"
  ON user_chatrooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

COMMENT ON TABLE user_chatrooms IS 'Assigns users (agents) to specific chatrooms for multi-tenant access control';
COMMENT ON COLUMN user_chatrooms.user_id IS 'Reference to the user being assigned';
COMMENT ON COLUMN user_chatrooms.chatroom_id IS 'Reference to the chatroom being accessed';
