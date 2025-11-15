# 🧪 Real-Time Messaging Test Guide

## Prerequisites

1. **Supabase Realtime is enabled** on the `messages` table
2. **Next.js dev server is running**: `npm run dev`
3. **You have a valid chatroom ID** from your database

---

## Step 1: Get a Valid Chatroom ID

Run this in Supabase SQL Editor:

```sql
SELECT id, name, twilio_number FROM chatrooms LIMIT 5;
```

Copy one of the `id` values (UUID format).

---

## Step 2: Open Your App

1. Navigate to the page that uses `ChatRoomMessages` component
2. Open browser **DevTools Console** (F12)
3. Look for these debug logs:
   ```
   🔄 ChatRoomMessages: Setting up for chatroom: <uuid>
   📥 Fetching existing messages...
   ✅ Loaded X existing messages
   🔌 Setting up real-time subscription...
   📡 Subscription status: SUBSCRIBED
   ✅ Real-time subscription active!
   ```

4. **If you DON'T see "SUBSCRIBED"**, check:
   - Supabase Realtime is enabled on `messages` table
   - Your Supabase project URL and keys are correct in `.env.local`
   - No console errors

---

## Step 3: Send a Test Message

### Option A: Using API Route (Recommended)

Open a new terminal and run:

```powershell
# Replace YOUR_CHATROOM_ID with actual UUID
$chatroomId = "ff42409a-747f-42d9-8b8a-40688e47e7be"

# Send test message
curl.exe -X POST http://localhost:3000/api/test/send-message `
  -H "Content-Type: application/json" `
  -d "{\"chatroom_id\": \"$chatroomId\", \"content\": \"Hello! This is a real-time test message\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test message sent successfully",
  "data": {
    "id": "uuid",
    "content": "Hello! This is a real-time test message",
    "chatroom_id": "ff42409a-747f-42d9-8b8a-40688e47e7be",
    ...
  },
  "chatroom": "Support Team"
}
```

### Option B: Direct SQL Insert

In Supabase SQL Editor:

```sql
INSERT INTO messages (from_number, to_number, content, type, read, chatroom_id, direction)
VALUES (
  '+15559999999',
  '+15551234567',
  'Test message from SQL!',
  'sms',
  false,
  'YOUR_CHATROOM_ID_HERE',  -- Replace with actual UUID
  'inbound'
)
RETURNING *;
```

---

## Step 4: Verify Real-Time Update

**In your browser console, you should see:**

```
🚀 Real-time message received: {
  id: "uuid",
  content: "Hello! This is a real-time test message",
  from_number: "+15559999999",
  chatroom_id: "ff42409a-747f-42d9-8b8a-40688e47e7be",
  ...
}
```

**In the UI, you should see:**
- The new message appears **instantly** without page refresh
- Debug status bar shows: "Real-time: ✅ Connected"
- Message count increases

---

## Step 5: Test Chatroom Filtering

1. **Get a DIFFERENT chatroom ID**:
   ```sql
   SELECT id FROM chatrooms WHERE id != 'YOUR_CURRENT_CHATROOM_ID' LIMIT 1;
   ```

2. **Send a message to the different chatroom**:
   ```powershell
   curl.exe -X POST http://localhost:3000/api/test/send-message `
     -H "Content-Type: application/json" `
     -d "{\"chatroom_id\": \"DIFFERENT_CHATROOM_ID\", \"content\": \"This should NOT appear\"}"
   ```

3. **Verify**: The message should **NOT** appear in your current view (chatroom filtering works!)

---

## Step 6: Test Multiple Messages

Send several messages rapidly:

```powershell
$chatroomId = "YOUR_CHATROOM_ID"

1..5 | ForEach-Object {
  curl.exe -X POST http://localhost:3000/api/test/send-message `
    -H "Content-Type: application/json" `
    -d "{\"chatroom_id\": \"$chatroomId\", \"content\": \"Message $_\"}"
  Start-Sleep -Milliseconds 500
}
```

**Expected**: All 5 messages appear in real-time, one by one.

---

## Troubleshooting

### ❌ Subscription Status: "CLOSED" or "CHANNEL_ERROR"

**Check:**
1. Supabase Realtime is enabled:
   - Go to Supabase Dashboard → Database → Replication
   - Find `messages` table → Enable realtime

2. Environment variables are correct:
   ```powershell
   Get-Content .env.local
   ```
   Should show:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. Restart Next.js server:
   ```powershell
   # Stop server (Ctrl+C), then:
   npm run dev
   ```

### ❌ No Console Logs Appear

**Check:**
1. Component is actually rendering:
   - Look for the debug status bar in UI
   - Check component receives `chatRoomId` prop

2. Import path is correct:
   - Should be `../../lib/supabaseClient` (relative)
   - NOT `@/lib/supabaseClient` (alias might not work)

### ❌ Messages Don't Appear in Real-Time

**Check:**
1. Filter is correct:
   ```javascript
   filter: `chatroom_id=eq.${chatRoomId}`
   ```
   The `chatRoomId` must match exactly (no typos, correct UUID)

2. Message was inserted with correct `chatroom_id`:
   ```sql
   SELECT id, content, chatroom_id 
   FROM messages 
   WHERE chatroom_id = 'YOUR_CHATROOM_ID'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. Browser console for errors

### ❌ "messages" table doesn't exist

Run the schema:
```powershell
Get-Content supabase-schema.sql
```
Copy and paste into Supabase SQL Editor.

---

## Expected Console Output (Success)

```
🔄 ChatRoomMessages: Setting up for chatroom: ff42409a-747f-42d9-8b8a-40688e47e7be
📥 Fetching existing messages...
✅ Loaded 0 existing messages
🔌 Setting up real-time subscription...
📡 Subscription status: SUBSCRIBED
✅ Real-time subscription active!

[After sending test message]
🚀 Real-time message received: {
  id: "abc123...",
  content: "Hello! This is a real-time test message",
  from_number: "+15559999999",
  to_number: "+15551234567",
  type: "sms",
  read: false,
  chatroom_id: "ff42409a-747f-42d9-8b8a-40688e47e7be",
  direction: "inbound",
  created_at: "2025-11-14T..."
}
```

---

## Clean Up Test Messages

After testing, delete test messages:

```sql
DELETE FROM messages 
WHERE from_number = '+15559999999' 
  AND content LIKE '%test%';
```

Or delete the test API route:

```powershell
Remove-Item src\MessageHub\pages\api\test\send-message.js
```

---

## Success Criteria

✅ Console shows "Real-time subscription active!"  
✅ Status bar shows "✅ Connected"  
✅ New messages appear instantly without refresh  
✅ Messages from other chatrooms don't appear (filtering works)  
✅ Multiple rapid messages all appear in order  
✅ UI updates match console logs  

---

## Next Steps After Successful Test

1. **Remove debug logs** from production (keep subscription logic)
2. **Delete test API route** (`api/test/send-message.js`)
3. **Implement send message UI** (textarea + send button)
4. **Add error boundaries** for subscription failures
5. **Add reconnection logic** if subscription drops
6. **Consider adding**:
   - Typing indicators
   - Message read receipts
   - Optimistic UI updates
   - Message pagination for large chats

---

## Advanced: Monitor Supabase Realtime

Check active connections in Supabase Dashboard:
- Go to Database → Replication
- See active real-time connections and subscriptions
