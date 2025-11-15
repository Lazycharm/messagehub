-- MessageHub Supabase Database Schema
-- Execute this in your Supabase SQL Editor to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CHATROOMS TABLE
-- Stores SMS chatroom configurations
-- ============================================
CREATE TABLE IF NOT EXISTS chatrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  twilio_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups by Twilio number
CREATE INDEX IF NOT EXISTS idx_chatrooms_twilio_number ON chatrooms(twilio_number);

-- ============================================
-- CONTACTS TABLE
-- Stores contact information linked to chatrooms
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT DEFAULT 'Unknown',
  phone_number TEXT NOT NULL,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_contacts_chatroom_id ON contacts(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);

-- ============================================
-- MESSAGES TABLE
-- Stores all messages (sent and received)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('sms', 'email')) DEFAULT 'sms',
  direction TEXT CHECK (direction IN ('inbound', 'outbound')) DEFAULT 'inbound',
  read BOOLEAN DEFAULT FALSE,
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_chatroom_id ON messages(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);

-- ============================================
-- INBOUND_MESSAGES TABLE
-- Stores inbound SMS from Twilio webhook
-- ============================================
CREATE TABLE IF NOT EXISTS inbound_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_number TEXT NOT NULL,
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_inbound_messages_chatroom_id ON inbound_messages(chatroom_id);
CREATE INDEX IF NOT EXISTS idx_inbound_messages_created_at ON inbound_messages(created_at DESC);

-- ============================================
-- USERS TABLE (Optional - for multi-user access)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- USER_CHATROOMS TABLE (Many-to-many pivot)
-- Links users to chatrooms they can access
-- ============================================
CREATE TABLE IF NOT EXISTS user_chatrooms (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, chatroom_id)
);

CREATE INDEX IF NOT EXISTS idx_user_chatrooms_user_id ON user_chatrooms(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chatrooms_chatroom_id ON user_chatrooms(chatroom_id);

-- ============================================
-- TEMPLATES TABLE (for SMS templates)
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('sms', 'email')) DEFAULT 'sms',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SETTINGS TABLE (app-wide settings)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ============================================
-- SENDER_NUMBERS TABLE (for outbound SMS)
-- ============================================
CREATE TABLE IF NOT EXISTS sender_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  provider TEXT DEFAULT 'twilio',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GROUPS TABLE (contact groups)
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- GROUP_MEMBERS TABLE (many-to-many for groups/contacts)
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (group_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_contact_id ON group_members(contact_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Uncomment and customize based on your auth needs
-- ============================================

-- Enable RLS on all tables
-- ALTER TABLE chatrooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inbound_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_chatrooms ENABLE ROW LEVEL SECURITY;

-- Example policy: Allow authenticated users to read all chatrooms
-- CREATE POLICY "Allow authenticated users to read chatrooms"
--   ON chatrooms FOR SELECT
--   USING (auth.role() = 'authenticated');

-- Example policy: Allow users to see only their chatrooms
-- CREATE POLICY "Users can view their own chatrooms"
--   ON chatrooms FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_chatrooms
--       WHERE user_chatrooms.chatroom_id = chatrooms.id
--       AND user_chatrooms.user_id = auth.uid()
--     )
--   );

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Insert sample chatroom
INSERT INTO chatrooms (name, twilio_number) VALUES
  ('Support Team', '+15551234567'),
  ('Sales Team', '+15557654321')
ON CONFLICT (twilio_number) DO NOTHING;

-- Insert sample user
INSERT INTO users (email, name) VALUES
  ('admin@messagehub.com', 'Admin User')
ON CONFLICT (email) DO NOTHING;

-- Insert sample template
INSERT INTO templates (name, content, type) VALUES
  ('Welcome SMS', 'Welcome to our service! Reply STOP to unsubscribe.', 'sms'),
  ('Follow-up', 'Hi {{name}}, just following up on your inquiry.', 'sms')
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCTIONS & TRIGGERS (Optional)
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column to tables that need it (uncomment if needed)
-- ALTER TABLE chatrooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create triggers (uncomment if using updated_at)
-- CREATE TRIGGER update_chatrooms_updated_at BEFORE UPDATE ON chatrooms
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS (for common queries)
-- ============================================

-- View: Recent messages with chatroom info
CREATE OR REPLACE VIEW recent_messages_with_chatrooms AS
SELECT 
  m.id,
  m.from_number,
  m.to_number,
  m.content,
  m.type,
  m.read,
  m.created_at,
  c.name AS chatroom_name,
  c.twilio_number
FROM messages m
LEFT JOIN chatrooms c ON m.chatroom_id = c.id
ORDER BY m.created_at DESC;

-- View: Chatroom statistics
CREATE OR REPLACE VIEW chatroom_stats AS
SELECT 
  c.id,
  c.name,
  c.twilio_number,
  COUNT(DISTINCT ct.id) AS total_contacts,
  COUNT(DISTINCT m.id) AS total_messages,
  COUNT(DISTINCT CASE WHEN m.read = FALSE THEN m.id END) AS unread_messages
FROM chatrooms c
LEFT JOIN contacts ct ON ct.chatroom_id = c.id
LEFT JOIN messages m ON m.chatroom_id = c.id
GROUP BY c.id, c.name, c.twilio_number;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'MessageHub database schema created successfully!';
  RAISE NOTICE 'Tables created: chatrooms, contacts, messages, inbound_messages, users, user_chatrooms, templates, settings, sender_numbers, groups, group_members';
  RAISE NOTICE 'Views created: recent_messages_with_chatrooms, chatroom_stats';
  RAISE NOTICE 'Sample data inserted for testing';
END $$;
