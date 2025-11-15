-- Migration: Allow contacts to have nullable names
-- Run this if you already have the database set up with name as NOT NULL

-- Step 1: Make the name column nullable and set default
ALTER TABLE contacts 
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN name SET DEFAULT 'Unknown';

-- Step 2: Update any existing contacts with empty names
UPDATE contacts 
SET name = 'Unknown' 
WHERE name IS NULL OR name = '';

-- Step 3: Add a unique constraint on phone_number + chatroom_id to prevent duplicates
-- (Optional - only if you want database-level duplicate prevention)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_phone_chatroom 
  ON contacts(phone_number, chatroom_id);

-- Verification query
SELECT 
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN name = 'Unknown' THEN 1 END) as unknown_names
FROM contacts;
