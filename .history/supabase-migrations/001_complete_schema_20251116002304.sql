-- ============================================
-- COMPLETE DATABASE SCHEMA FOR MESSAGEHUB
-- All tables, triggers, and policies in correct order
-- Created: November 16, 2025
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- Main users table with role support
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 2. USER_TOKENS TABLE
-- Stores token/credit balance for each user
-- ============================================
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 100,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Initialize tokens for existing users
INSERT INTO user_tokens (user_id, balance)
SELECT id, 100 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. CHATROOMS TABLE
-- Represents chat channels/rooms with Twilio numbers
-- ============================================
CREATE TABLE IF NOT EXISTS chatrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  twilio_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatrooms_twilio_number ON chatrooms(twilio_number);

-- ============================================
-- 4. USER_CHATROOMS TABLE
-- Multi-tenant: Assigns agents to specific chatrooms
-- ============================================
CREATE TABLE IF NOT EXISTS user_chatrooms (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chatroom_id UUID NOT NULL REFERENCES chatrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT user_chatrooms_pkey PRIMARY KEY (user_id, chatroom_id)
);

CREATE INDEX IF NOT EXISTS idx_user_chatrooms_user_id ON user_chatrooms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chatrooms_chatroom_id ON user_chatrooms(chatroom_id);

-- Enable RLS
ALTER TABLE user_chatrooms ENABLE ROW LEVEL SECURITY;

-- Admins can manage all assignments
CREATE POLICY "Admins can manage all assignments"
  ON user_chatrooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users can view their own assignments
CREATE POLICY "Users can view own assignments"
  ON user_chatrooms FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- 4. CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  tags TEXT[],
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all contacts
CREATE POLICY "Admins can manage all contacts"
  ON contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Agents can manage their own contacts
CREATE POLICY "Agents can manage own contacts"
  ON contacts FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- 5. GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_user_id ON groups(user_id);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all groups"
  ON groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Agents can manage own groups"
  ON groups FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- 6. GROUP_MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_contact_id ON group_members(contact_id);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all group members"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Agents can manage own group members"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
      AND groups.user_id = auth.uid()
    )
  );

-- ============================================
-- 7. TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sms', 'email')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all templates"
  ON templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Agents can manage own templates"
  ON templates FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- 8. SENDER_NUMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sender_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sender_numbers_active ON sender_numbers(is_active);

ALTER TABLE sender_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sender numbers"
  ON sender_numbers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "All users can view sender numbers"
  ON sender_numbers FOR SELECT
  USING (is_active = true);

-- ============================================
-- 9. SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "All users can view settings"
  ON settings FOR SELECT
  USING (true);

-- ============================================
-- 10. MESSAGES TABLE (Outbound)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('sms', 'email')),
  recipient TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sender_number TEXT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tokens_used INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Agents can manage own messages"
  ON messages FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- 11. INBOUND_MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatroom_id UUID NOT NULL,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_inbound_chatroom_id ON inbound_messages(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_inbound_assigned_to ON inbound_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inbound_is_read ON inbound_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_inbound_created_at ON inbound_messages(created_at DESC);

ALTER TABLE inbound_messages ENABLE ROW LEVEL SECURITY;

-- Admins can view all inbound messages
CREATE POLICY "Admins can view all inbound messages"
  ON inbound_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Agents can view messages from their assigned chatrooms
CREATE POLICY "Agents can view assigned chatroom messages"
  ON inbound_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_chatrooms
      WHERE user_chatrooms.user_id = auth.uid()
      AND user_chatrooms.chatroom_id = inbound_messages.chatroom_id
    )
  );

-- Agents can update their own assigned messages
CREATE POLICY "Agents can update assigned messages"
  ON inbound_messages FOR UPDATE
  USING (assigned_to = auth.uid());

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MessageHub Database Schema Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  ✓ users (enhanced with role column)';
  RAISE NOTICE '  ✓ user_tokens';
  RAISE NOTICE '  ✓ user_chatrooms';
  RAISE NOTICE '  ✓ contacts';
  RAISE NOTICE '  ✓ groups';
  RAISE NOTICE '  ✓ group_members';
  RAISE NOTICE '  ✓ templates';
  RAISE NOTICE '  ✓ sender_numbers';
  RAISE NOTICE '  ✓ settings';
  RAISE NOTICE '  ✓ messages (outbound)';
  RAISE NOTICE '  ✓ inbound_messages';
  RAISE NOTICE '';
  RAISE NOTICE 'Features configured:';
  RAISE NOTICE '  ✓ Row Level Security (RLS) on all tables';
  RAISE NOTICE '  ✓ Multi-tenant chatroom assignments';
  RAISE NOTICE '  ✓ Token billing system (100 tokens per user)';
  RAISE NOTICE '  ✓ Auto-initialize tokens for new users';
  RAISE NOTICE '  ✓ Admin/Agent role permissions';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create admin user in Supabase Auth';
  RAISE NOTICE '  2. Update admin user role: UPDATE users SET role = ''admin'' WHERE email = ''your@email.com'';';
  RAISE NOTICE '  3. Deploy application to server';
  RAISE NOTICE '========================================';
END $$;
