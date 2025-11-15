-- Migration: Add direction column to messages table
-- This allows differentiating between inbound and outbound messages

-- Add direction column with default 'inbound'
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS direction TEXT CHECK (direction IN ('inbound', 'outbound')) DEFAULT 'inbound';

-- Create index for faster filtering by direction
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);

-- Update existing messages (optional - set based on your logic)
-- Assuming messages from your system start with a specific pattern
-- UPDATE messages SET direction = 'outbound' WHERE from_number LIKE '+1555%';

-- Verification
SELECT 
  direction,
  COUNT(*) as count
FROM messages
GROUP BY direction;
