-- Create admin_notifications table for admin-to-user notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_role TEXT, -- 'admin', 'user', or NULL for all users
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Either target_user_id or target_role must be set
  CONSTRAINT check_target CHECK (
    (target_user_id IS NOT NULL AND target_role IS NULL) OR
    (target_user_id IS NULL AND target_role IS NOT NULL)
  )
);

-- Index for efficient querying
CREATE INDEX idx_admin_notifications_target_user ON admin_notifications(target_user_id, is_read, created_at DESC);
CREATE INDEX idx_admin_notifications_target_role ON admin_notifications(target_role, is_read, created_at DESC);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Users can see notifications targeted to them or their role
CREATE POLICY "Users can view their own notifications" ON admin_notifications
  FOR SELECT
  USING (
    target_user_id = auth.uid() OR
    target_role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications" ON admin_notifications
  FOR UPDATE
  USING (
    target_user_id = auth.uid() OR
    target_role = (SELECT role FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    target_user_id = auth.uid() OR
    target_role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Only admins can create notifications
CREATE POLICY "Admins can create notifications" ON admin_notifications
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Admins can see all notifications
CREATE POLICY "Admins can view all notifications" ON admin_notifications
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications" ON admin_notifications
  FOR DELETE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

COMMENT ON TABLE admin_notifications IS 'System notifications sent by admins to users';
