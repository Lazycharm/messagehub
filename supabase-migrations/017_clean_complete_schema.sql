-- ============================================
-- MIGRATION 017: Complete Clean Schema
-- Full database schema for MessageHub
-- This is the definitive schema - all tables with proper relationships
-- ============================================

-- Drop all existing tables (in correct order to respect foreign keys)
DROP TABLE IF EXISTS public.admin_action_logs CASCADE;
DROP TABLE IF EXISTS public.admin_notifications CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.inbound_messages CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.user_chatrooms CASCADE;
DROP TABLE IF EXISTS public.chatrooms CASCADE;
DROP TABLE IF EXISTS public.sender_numbers CASCADE;
DROP TABLE IF EXISTS public.resource_pool CASCADE;
DROP TABLE IF EXISTS public.user_quotas CASCADE;
DROP TABLE IF EXISTS public.user_tokens CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.api_providers CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table (no dependencies)
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  role text DEFAULT 'agent'::text CHECK (role = ANY (ARRAY['admin'::text, 'agent'::text])),
  full_name text,
  password_hash text,
  is_approved boolean DEFAULT false,
  approved_by uuid,
  approved_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- API Providers
CREATE TABLE public.api_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_type text NOT NULL CHECK (provider_type = ANY (ARRAY['sms'::text, 'email'::text, 'viber'::text, 'whatsapp'::text])),
  provider_name text NOT NULL,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT api_providers_pkey PRIMARY KEY (id),
  CONSTRAINT api_providers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Sender Numbers
CREATE TABLE public.sender_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  phone_number text UNIQUE,
  provider text DEFAULT 'twilio'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  label text,
  number_or_id text,
  type text NOT NULL DEFAULT 'phone'::text CHECK (type = ANY (ARRAY['sms'::text, 'email'::text, 'viber'::text, 'whatsapp'::text])),
  region text,
  message_count integer DEFAULT 0,
  active boolean DEFAULT true,
  capabilities jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT sender_numbers_pkey PRIMARY KEY (id)
);

-- Chatrooms
CREATE TABLE public.chatrooms (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  sender_number text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  provider text DEFAULT 'twilio'::text CHECK (provider = ANY (ARRAY['twilio'::text, 'infobip'::text, 'base44'::text, 'viber'::text, 'whatsapp'::text, 'email'::text])),
  provider_account_id uuid,
  is_active boolean DEFAULT true,
  capabilities jsonb DEFAULT '{"sms": true}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  sender_number_id uuid,
  CONSTRAINT chatrooms_pkey PRIMARY KEY (id),
  CONSTRAINT chatrooms_provider_account_id_fkey FOREIGN KEY (provider_account_id) REFERENCES public.api_providers(id) ON DELETE SET NULL,
  CONSTRAINT chatrooms_sender_number_id_fkey FOREIGN KEY (sender_number_id) REFERENCES public.sender_numbers(id) ON DELETE SET NULL
);

-- Groups
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);

-- Settings
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (id)
);

-- Templates
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'sms'::text CHECK (type = ANY (ARRAY['sms'::text, 'email'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT templates_pkey PRIMARY KEY (id)
);

-- ============================================
-- DEPENDENT TABLES
-- ============================================

-- User Tokens
CREATE TABLE public.user_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 100,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  access_token text UNIQUE,
  is_approved boolean DEFAULT false,
  is_active boolean DEFAULT true,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  last_used_at timestamp with time zone,
  CONSTRAINT user_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT user_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_tokens_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- User Quotas
CREATE TABLE public.user_quotas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  max_real_numbers integer DEFAULT 5,
  max_clients_per_number integer DEFAULT 1000,
  max_messages_per_day integer DEFAULT 10000,
  messages_sent_today integer DEFAULT 0,
  quota_reset_at timestamp with time zone DEFAULT (now() + '1 day'::interval),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_quotas_pkey PRIMARY KEY (id),
  CONSTRAINT user_quotas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- User-Chatroom Assignments
CREATE TABLE public.user_chatrooms (
  user_id uuid NOT NULL,
  chatroom_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_chatrooms_pkey PRIMARY KEY (user_id, chatroom_id),
  CONSTRAINT user_chatrooms_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_chatrooms_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id) ON DELETE CASCADE
);

-- Resource Pool
CREATE TABLE public.resource_pool (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  email text,
  tags text[] DEFAULT '{}'::text[],
  status text DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'assigned'::text, 'blocked'::text])),
  assigned_to_user_id uuid,
  assigned_at timestamp with time zone,
  import_batch_id uuid,
  import_date timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT resource_pool_pkey PRIMARY KEY (id),
  CONSTRAINT resource_pool_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Contacts
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text DEFAULT 'Unknown'::text,
  phone_number text NOT NULL,
  email text,
  tags text[] DEFAULT '{}'::text[],
  chatroom_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  first_name text,
  last_name text,
  import_batch_id uuid,
  import_date timestamp with time zone,
  assigned_to_user_id uuid,
  is_available boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  is_favorite boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  added_via text DEFAULT 'manual'::text CHECK (added_via = ANY (ARRAY['manual'::text, 'import'::text])),
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id) ON DELETE SET NULL,
  CONSTRAINT contacts_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Messages
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  from_number text NOT NULL,
  to_number text NOT NULL,
  content text NOT NULL,
  type text DEFAULT 'sms'::text CHECK (type = ANY (ARRAY['sms'::text, 'email'::text])),
  read boolean DEFAULT false,
  chatroom_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  direction text DEFAULT 'inbound'::text CHECK (direction = ANY (ARRAY['inbound'::text, 'outbound'::text])),
  twilio_message_sid text,
  status text,
  contact_id uuid,
  user_id uuid,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id) ON DELETE SET NULL,
  CONSTRAINT messages_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL,
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Inbound Messages
CREATE TABLE public.inbound_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  from_number text NOT NULL,
  chatroom_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  contact_id uuid,
  CONSTRAINT inbound_messages_pkey PRIMARY KEY (id),
  CONSTRAINT inbound_messages_chatroom_id_fkey FOREIGN KEY (chatroom_id) REFERENCES public.chatrooms(id) ON DELETE SET NULL,
  CONSTRAINT inbound_messages_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL
);

-- Group Members
CREATE TABLE public.group_members (
  group_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (group_id, contact_id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT group_members_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE
);

-- Admin Notifications
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'error'::text])),
  target_user_id uuid,
  target_role text,
  created_by uuid,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT admin_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT admin_notifications_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT admin_notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Admin Action Logs
CREATE TABLE public.admin_action_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_type text,
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_action_logs_pkey PRIMARY KEY (id),
  CONSTRAINT admin_action_logs_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_messages_chatroom_id ON public.messages(chatroom_id);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_messages_status ON public.messages(status);
CREATE INDEX idx_messages_twilio_sid ON public.messages(twilio_message_sid);

CREATE INDEX idx_contacts_chatroom_id ON public.contacts(chatroom_id);
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_phone_number ON public.contacts(phone_number);

CREATE INDEX idx_inbound_messages_chatroom_id ON public.inbound_messages(chatroom_id);
CREATE INDEX idx_inbound_messages_created_at ON public.inbound_messages(created_at);

CREATE INDEX idx_user_chatrooms_user_id ON public.user_chatrooms(user_id);
CREATE INDEX idx_user_chatrooms_chatroom_id ON public.user_chatrooms(chatroom_id);

CREATE INDEX idx_admin_notifications_target_user_id ON public.admin_notifications(target_user_id);
CREATE INDEX idx_admin_notifications_is_read ON public.admin_notifications(is_read);

CREATE INDEX idx_resource_pool_assigned_to_user_id ON public.resource_pool(assigned_to_user_id);
CREATE INDEX idx_resource_pool_status ON public.resource_pool(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chatrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sender_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Messages policies
CREATE POLICY "Users can insert their own messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view their chatroom messages" ON public.messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM user_chatrooms WHERE user_chatrooms.user_id = auth.uid() AND user_chatrooms.chatroom_id = messages.chatroom_id) OR
    auth.uid() = messages.user_id
  );

CREATE POLICY "Admins can manage all messages" ON public.messages
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Contacts policies
CREATE POLICY "Users can view chatroom contacts" ON public.contacts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM user_chatrooms WHERE user_chatrooms.user_id = auth.uid() AND user_chatrooms.chatroom_id = contacts.chatroom_id) OR
    auth.uid() = contacts.user_id
  );

CREATE POLICY "Users can manage own contacts" ON public.contacts
  FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Chatrooms policies
CREATE POLICY "Everyone can view chatrooms" ON public.chatrooms
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage chatrooms" ON public.chatrooms
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- User-Chatrooms policies
CREATE POLICY "Users can view own assignments" ON public.user_chatrooms
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage assignments" ON public.user_chatrooms
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Inbound Messages policies
CREATE POLICY "Users can view inbound messages" ON public.inbound_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM user_chatrooms WHERE user_chatrooms.user_id = auth.uid() AND user_chatrooms.chatroom_id = inbound_messages.chatroom_id)
  );

CREATE POLICY "Admins can manage inbound messages" ON public.inbound_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Sender Numbers policies
CREATE POLICY "Everyone can view sender numbers" ON public.sender_numbers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage sender numbers" ON public.sender_numbers
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Settings policies
CREATE POLICY "Everyone can view settings" ON public.settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.settings
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Templates policies
CREATE POLICY "Everyone can view templates" ON public.templates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage templates" ON public.templates
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Groups policies
CREATE POLICY "Everyone can view groups" ON public.groups
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage groups" ON public.groups
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Group Members policies
CREATE POLICY "Everyone can view group members" ON public.group_members
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage group members" ON public.group_members
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- User Tokens policies
CREATE POLICY "Users can view own tokens" ON public.user_tokens
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage all tokens" ON public.user_tokens
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- API Providers policies
CREATE POLICY "Admins can manage api_providers" ON public.api_providers
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Resource Pool policies
CREATE POLICY "Admins can manage resource pool" ON public.resource_pool
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view assigned resources" ON public.resource_pool
  FOR SELECT USING (auth.uid() = assigned_to_user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- User Quotas policies
CREATE POLICY "Users can view own quota" ON public.user_quotas
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage all quotas" ON public.user_quotas
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Admin Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.admin_notifications
  FOR SELECT USING (
    auth.uid() = target_user_id OR 
    (target_role IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = target_role)) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update their own notifications" ON public.admin_notifications
  FOR UPDATE USING (auth.uid() = target_user_id) WITH CHECK (auth.uid() = target_user_id);

CREATE POLICY "Admins can create notifications" ON public.admin_notifications
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view all notifications" ON public.admin_notifications
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete notifications" ON public.admin_notifications
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Admin Action Logs policies
CREATE POLICY "Admins can view all logs" ON public.admin_action_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert logs" ON public.admin_action_logs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- SYSTEM CONFIGURATION
-- ============================================

-- Insert default system config for notifications
INSERT INTO public.settings (key, value) VALUES 
  ('notification_system_enabled', 'true'),
  ('notification_default_expiry_days', '30')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 017 complete: Clean schema with all tables and policies';
END $$;
