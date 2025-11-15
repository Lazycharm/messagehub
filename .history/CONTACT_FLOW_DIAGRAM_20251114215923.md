# 📊 Contact Creation Flow Diagram

## Flow 1: Manual Contact Addition

```
Frontend Form
     ↓
POST /api/chatrooms/[id]/contacts
     ↓
Validate phone_number (required)
     ↓
     ├─→ [Empty/Missing] → Skip with reason
     └─→ [Valid] → Continue
     ↓
Check if exists (phone + chatroom)
     ↓
     ├─→ [Exists] → Skip with "Duplicate"
     └─→ [New] → Continue
     ↓
Sanitize data:
  - name: trim or "Unknown"
  - email: lowercase + trim
  - tags: array or []
     ↓
INSERT into contacts
     ↓
Return: {added: N, skipped: M, contacts: [...]}
```

---

## Flow 2: CSV Import

```
Upload CSV File
     ↓
POST /api/chatrooms/import-csv
     ↓
Verify chatroom exists
     ↓
Fetch existing contacts (phone_numbers)
     ↓
Parse CSV row-by-row
     ↓
For each row:
  ├─→ No phone_number? → Skip (track row #)
  ├─→ Duplicate in DB? → Skip (track row #)
  ├─→ Duplicate in CSV? → Skip (track row #)
  └─→ Valid? → Add to batch
     ↓
     name: CSV value or "Unknown"
     email: lowercase or null
     tags: parse comma-separated
     ↓
BULK INSERT all valid contacts
     ↓
Delete temp file
     ↓
Return: {
  imported: N,
  skipped: M,
  total_rows: X,
  skipped_details: [...]
}
```

---

## Flow 3: Inbound SMS (Twilio Webhook)

```
SMS arrives at Twilio
     ↓
Twilio webhook → POST /api/messages/inbound
  Payload: {From, To, Body}
     ↓
Find chatroom (match To = twilio_number)
     ↓
     ├─→ [Not found] → 404 Error
     └─→ [Found] → Continue
     ↓
Check if contact exists (From + chatroom_id)
     ↓
     ├─→ [Exists] → Use existing
     └─→ [New] → AUTO-CREATE:
              {
                phone_number: From,
                name: "Unknown",
                chatroom_id: chatroom.id
              }
     ↓
Store in inbound_messages
     ↓
Store in messages (unified inbox)
     ↓
Return TwiML to Twilio
```

---

## Data Sanitization Pipeline

```
Input Contact Object
     ↓
┌──────────────────────────────────┐
│ PHONE_NUMBER (required)          │
├──────────────────────────────────┤
│ • Type check (string)            │
│ • Trim whitespace                │
│ • Check not empty                │
│ • Check for duplicates           │
└──────────────────────────────────┘
     ↓
┌──────────────────────────────────┐
│ NAME (optional)                  │
├──────────────────────────────────┤
│ • Exists? → Trim                 │
│ • Empty/Missing? → "Unknown"     │
└──────────────────────────────────┘
     ↓
┌──────────────────────────────────┐
│ EMAIL (optional)                 │
├──────────────────────────────────┤
│ • Exists? → Trim + Lowercase     │
│ • Missing? → null                │
└──────────────────────────────────┘
     ↓
┌──────────────────────────────────┐
│ TAGS (optional)                  │
├──────────────────────────────────┤
│ • Array? → Use as-is             │
│ • String? → Split by comma       │
│ • Missing? → []                  │
└──────────────────────────────────┘
     ↓
Sanitized Contact Ready for DB
```

---

## Duplicate Detection Logic

```
New Contact Submission
  phone_number: "+15559999999"
  chatroom_id: "abc-123"
     ↓
Query Supabase:
  SELECT id FROM contacts
  WHERE phone_number = "+15559999999"
    AND chatroom_id = "abc-123"
     ↓
     ├─→ [Found] → SKIP
     │    Reason: "Contact already exists in this chatroom"
     │
     └─→ [Not Found] → INSERT
          New contact created ✅
```

### Multi-Chatroom Scenario

```
Contact A:
  phone: "+15559999999"
  chatroom: "room-1"  ✅ ALLOWED

Contact A (again):
  phone: "+15559999999"
  chatroom: "room-2"  ✅ ALLOWED (different chatroom)

Contact A (duplicate):
  phone: "+15559999999"
  chatroom: "room-1"  ❌ REJECTED (duplicate)
```

---

## CSV Import Example Flow

**Input CSV:**
```csv
name,phone_number,email,tags
John Doe,+15551111111,john@test.com,"vip,customer"
,+15552222222,jane@test.com,
Alice,+15553333333,,prospect
,+15554444444,,
```

**Processing:**

| Row | Name | Phone | Email | Tags | Result |
|-----|------|-------|-------|------|--------|
| 1 | John Doe | +15551111111 | john@test.com | ["vip","customer"] | ✅ Imported |
| 2 | Unknown | +15552222222 | jane@test.com | [] | ✅ Imported |
| 3 | Alice | +15553333333 | null | ["prospect"] | ✅ Imported |
| 4 | Unknown | +15554444444 | null | [] | ✅ Imported |

**Response:**
```json
{
  "message": "Contacts imported successfully",
  "imported": 4,
  "skipped": 0,
  "total_rows": 4,
  "contacts": [...]
}
```

---

## Error Handling Paths

```
API Request
     ↓
     ├─→ Missing phone_number
     │        ↓
     │   Skip + Track reason
     │
     ├─→ Empty phone_number
     │        ↓
     │   Skip + Track reason
     │
     ├─→ Duplicate detected
     │        ↓
     │   Skip + Track reason
     │
     ├─→ Database error
     │        ↓
     │   Return 500 + error details
     │
     └─→ Valid data
              ↓
         INSERT success
              ↓
         Return in "contacts" array
```

---

## Frontend Integration Points

### 1. Contact List Display
```jsx
contacts.map(contact => (
  <div key={contact.id}>
    <strong>
      {contact.name !== 'Unknown' ? contact.name : contact.phone_number}
    </strong>
    <small>{contact.email || 'No email'}</small>
  </div>
))
```

### 2. Contact Form
```jsx
<form onSubmit={handleSubmit}>
  <input 
    name="phone_number" 
    required 
    placeholder="Phone number *" 
  />
  <input 
    name="name" 
    placeholder="Name (optional, defaults to Unknown)" 
  />
  <input 
    name="email" 
    type="email" 
    placeholder="Email (optional)" 
  />
</form>
```

### 3. CSV Upload
```jsx
<form onSubmit={handleCSVUpload}>
  <input type="file" accept=".csv" required />
  <select name="chatroomId" required>
    {chatrooms.map(room => (
      <option key={room.id} value={room.id}>
        {room.name}
      </option>
    ))}
  </select>
  <button type="submit">Import Contacts</button>
</form>
```

### 4. Handle Import Response
```jsx
const handleImportResponse = (data) => {
  if (data.imported > 0) {
    toast.success(`${data.imported} contacts imported`);
  }
  if (data.skipped > 0) {
    toast.warning(`${data.skipped} rows skipped (duplicates or invalid)`);
    console.log('Skipped details:', data.skipped_details);
  }
};
```

---

## Database State Examples

### Before: Name Required (Old)
```sql
-- This would FAIL:
INSERT INTO contacts (phone_number, chatroom_id) 
VALUES ('+15559999999', 'uuid-123');
-- Error: null value in column "name" violates not-null constraint
```

### After: Name Optional (New)
```sql
-- This SUCCEEDS:
INSERT INTO contacts (phone_number, chatroom_id) 
VALUES ('+15559999999', 'uuid-123');
-- Result: name defaults to "Unknown"

-- Query result:
{
  id: "contact-uuid",
  phone_number: "+15559999999",
  name: "Unknown",
  email: null,
  tags: [],
  chatroom_id: "uuid-123"
}
```

---

## Summary: 3 Ways to Create Contacts

| Method | Name Required? | Auto-Duplicate Check? | Use Case |
|--------|---------------|----------------------|----------|
| **Manual API** | ❌ No | ✅ Yes | Admin adding single contact |
| **CSV Import** | ❌ No | ✅ Yes | Bulk import from spreadsheet |
| **SMS Webhook** | ❌ No | ✅ Yes | Auto-create from inbound SMS |

**All three methods:**
- Allow missing names → defaults to "Unknown"
- Prevent duplicates → skip if exists
- Sanitize data → trim, lowercase emails
- Return detailed results → skip reasons included
