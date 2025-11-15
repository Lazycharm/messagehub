# MessageHub API Testing Guide

This guide shows how to test all Supabase-powered API endpoints.

## Prerequisites

1. **Supabase Setup**: Ensure your Supabase project has these tables:
   - `chatrooms` (id, name, twilio_number, created_at)
   - `contacts` (id, name, phone_number, email, tags, chatroom_id, created_at)
   - `messages` (id, from_number, to_number, content, type, read, chatroom_id, created_at)
   - `inbound_messages` (id, from_number, chatroom_id, content, created_at)

2. **Environment Variables**: Check `.env.local` has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Dependencies Installed**:
   ```bash
   npm install @supabase/supabase-js formidable csv-parse
   ```

---

## 🧪 API Endpoint Tests

### 1. Chatrooms API (`/api/chatrooms`)

#### Create a Chatroom (POST)
```bash
curl -X POST http://localhost:3000/api/chatrooms \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Team",
    "twilio_number": "+15551234567"
  }'
```

**Expected Response (201)**:
```json
{
  "id": "uuid-here",
  "name": "Support Team",
  "twilio_number": "+15551234567",
  "created_at": "2025-11-14T..."
}
```

#### Get All Chatrooms (GET)
```bash
curl http://localhost:3000/api/chatrooms
```

**Expected Response (200)**:
```json
[
  {
    "id": "uuid-1",
    "name": "Support Team",
    "twilio_number": "+15551234567",
    "created_at": "2025-11-14T..."
  },
  {
    "id": "uuid-2",
    "name": "Sales Team",
    "twilio_number": "+15557654321",
    "created_at": "2025-11-13T..."
  }
]
```

---

### 2. Assign Contacts (`/api/chatrooms/[id]/contacts`)

#### Add Contacts to Chatroom (PATCH)
```bash
curl -X PATCH http://localhost:3000/api/chatrooms/YOUR_CHATROOM_ID/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {
        "name": "John Doe",
        "phone_number": "+15559876543",
        "email": "john@example.com",
        "tags": ["vip", "customer"]
      },
      {
        "name": "Jane Smith",
        "phone_number": "+15559871234",
        "email": "jane@example.com"
      }
    ]
  }'
```

**Expected Response (200)**:
```json
{
  "message": "Contacts added successfully",
  "count": 2,
  "contacts": [
    {
      "id": "uuid-1",
      "name": "John Doe",
      "phone_number": "+15559876543",
      "email": "john@example.com",
      "tags": ["vip", "customer"],
      "chatroom_id": "YOUR_CHATROOM_ID",
      "created_at": "2025-11-14T..."
    },
    ...
  ]
}
```

---

### 3. CSV Import (`/api/chatrooms/import-csv`)

#### Create a Test CSV File
Create `test-contacts.csv`:
```csv
name,phone_number,email,tags
Alice Johnson,+15551111111,alice@example.com,"lead,prospect"
Bob Williams,+15552222222,bob@example.com,customer
Carol Davis,+15553333333,carol@example.com,"vip,priority"
```

#### Upload CSV (POST)
Using `curl` (PowerShell):
```powershell
curl.exe -X POST http://localhost:3000/api/chatrooms/import-csv `
  -F "file=@test-contacts.csv" `
  -F "chatroomId=YOUR_CHATROOM_ID"
```

Using `Invoke-RestMethod` (PowerShell):
```powershell
$form = @{
    file = Get-Item -Path "test-contacts.csv"
    chatroomId = "YOUR_CHATROOM_ID"
}
Invoke-RestMethod -Uri "http://localhost:3000/api/chatrooms/import-csv" -Method Post -Form $form
```

**Expected Response (200)**:
```json
{
  "message": "Contacts imported successfully",
  "imported": 3,
  "contacts": [
    {
      "id": "uuid-1",
      "name": "Alice Johnson",
      "phone_number": "+15551111111",
      "email": "alice@example.com",
      "tags": ["lead", "prospect"],
      "chatroom_id": "YOUR_CHATROOM_ID"
    },
    ...
  ]
}
```

---

### 4. Inbound Messages Webhook (`/api/messages/inbound`)

#### Simulate Twilio Webhook (POST)
This endpoint receives SMS from Twilio:

```bash
curl -X POST http://localhost:3000/api/messages/inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=%2B15559876543&To=%2B15551234567&Body=Hello%20from%20customer"
```

**Expected Response (200)**:
```xml
<?xml version="1.0" encoding="UTF-8"?><Response></Response>
```

#### Get All Inbound Messages (GET)
```bash
curl http://localhost:3000/api/messages/inbound
```

**Expected Response (200)**:
```json
[
  {
    "id": "uuid-1",
    "from_number": "+15559876543",
    "chatroom_id": "uuid-chatroom",
    "content": "Hello from customer",
    "created_at": "2025-11-14T...",
    "chatrooms": {
      "name": "Support Team",
      "twilio_number": "+15551234567"
    }
  }
]
```

---

## 🔧 Twilio Webhook Configuration

1. Go to your Twilio Console
2. Navigate to Phone Numbers → Active Numbers → Select your number
3. Under "Messaging", set the webhook URL:
   ```
   https://your-domain.com/api/messages/inbound
   ```
4. Set HTTP method to `POST`
5. Save changes

---

## ❌ Common Error Responses

### 400 Bad Request
```json
{
  "error": "Chatroom name and twilio_number are required"
}
```

### 404 Not Found
```json
{
  "error": "Chatroom not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to create chatroom",
  "details": "Supabase error details here"
}
```

---

## 📊 Database Schema Quick Reference

```sql
-- chatrooms table
CREATE TABLE chatrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  twilio_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  tags TEXT[],
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('sms', 'email')),
  read BOOLEAN DEFAULT FALSE,
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- inbound_messages table
CREATE TABLE inbound_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_number TEXT NOT NULL,
  chatroom_id UUID REFERENCES chatrooms(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 Testing Workflow

1. **Start your Next.js dev server**:
   ```bash
   npm run dev
   ```

2. **Create a chatroom**:
   ```bash
   curl -X POST http://localhost:3000/api/chatrooms \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Room", "twilio_number": "+15551234567"}'
   ```

3. **Copy the returned `id`** from the response

4. **Add contacts manually**:
   ```bash
   curl -X PATCH http://localhost:3000/api/chatrooms/YOUR_ID/contacts \
     -H "Content-Type: application/json" \
     -d '{"contacts": [{"name": "Test User", "phone_number": "+15559999999"}]}'
   ```

5. **Or import from CSV**:
   ```bash
   curl.exe -X POST http://localhost:3000/api/chatrooms/import-csv \
     -F "file=@contacts.csv" \
     -F "chatroomId=YOUR_ID"
   ```

6. **Test Twilio webhook** (simulate incoming SMS):
   ```bash
   curl -X POST http://localhost:3000/api/messages/inbound \
     -d "From=%2B15559999999&To=%2B15551234567&Body=Test%20message"
   ```

7. **Verify in Supabase dashboard** that data was inserted correctly

---

## 🛠️ Debugging Tips

- Check browser console for errors
- View Supabase logs in your project dashboard
- Use `console.log` in API routes to debug
- Check PostgreSQL error messages in responses
- Verify UUIDs are valid format
- Ensure foreign key relationships are correct
