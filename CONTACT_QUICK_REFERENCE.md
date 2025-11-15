# 🎯 Quick Reference: Contact Handling

## Field Requirements

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `phone_number` | ✅ Yes | - | Must be non-empty string |
| `name` | ❌ No | `"Unknown"` | Nullable, trimmed |
| `email` | ❌ No | `null` | Trimmed, lowercased |
| `tags` | ❌ No | `[]` | Array of strings |
| `chatroom_id` | ✅ Yes | - | UUID (auto-added by API) |

---

## API Endpoints Summary

### 1. Add Contacts Manually
**PATCH** `/api/chatrooms/[id]/contacts`

```bash
curl -X PATCH http://localhost:3000/api/chatrooms/UUID/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"phone_number": "+15559999999"}
    ]
  }'
```

**Returns:**
- `added` - Number of contacts created
- `skipped` - Number of duplicates/invalid
- `contacts` - Array of created contacts
- `skipped_details` - Why contacts were skipped

---

### 2. Import Contacts from CSV
**POST** `/api/chatrooms/import-csv`

```bash
curl.exe -X POST http://localhost:3000/api/chatrooms/import-csv \
  -F "file=@contacts.csv" \
  -F "chatroomId=UUID"
```

**CSV Format:**
```csv
phone_number,name,email,tags
+15551111111,John Doe,john@test.com,"vip,customer"
+15552222222,,,prospect
+15553333333
```

**Returns:**
- `imported` - Contacts successfully added
- `skipped` - Duplicates or invalid rows
- `total_rows` - Total CSV rows processed
- `skipped_details` - Row-level errors

---

### 3. Inbound SMS (Twilio Webhook)
**POST** `/api/messages/inbound`

**Auto-creates contacts** for unknown senders.

Twilio sends:
```
From: +15559999999
To: +15551234567
Body: Hello!
```

System automatically:
1. Finds chatroom for `+15551234567`
2. Checks if contact exists for `+15559999999`
3. **Creates contact if missing** (`name: "Unknown"`)
4. Stores message

---

## Duplicate Prevention

Duplicates detected by: **`phone_number` + `chatroom_id`**

### Same Contact, Different Chatrooms ✅
```javascript
// Contact A in Chatroom 1
{ phone_number: "+15559999999", chatroom_id: "uuid-1" } ✅

// Contact A in Chatroom 2  
{ phone_number: "+15559999999", chatroom_id: "uuid-2" } ✅
```

### Same Contact, Same Chatroom ❌
```javascript
// First insert
{ phone_number: "+15559999999", chatroom_id: "uuid-1" } ✅

// Second insert (SKIPPED)
{ phone_number: "+15559999999", chatroom_id: "uuid-1" } ❌ Duplicate
```

---

## Common Scenarios

### Scenario 1: CSV with Missing Names
```csv
phone_number,email
+15551111111,john@example.com
+15552222222,
+15553333333
```

**Result:** All 3 contacts created with `name: "Unknown"`

---

### Scenario 2: SMS from Unknown Number
```
Twilio webhook:
  From: +15559999999 (not in contacts)
  To: +15551234567
  Body: "Hi there!"
```

**Result:** 
- Contact auto-created: `{phone_number: "+15559999999", name: "Unknown"}`
- Message stored

---

### Scenario 3: Re-importing Same CSV
**First import:** 10 contacts added  
**Second import:** 0 added, 10 skipped (duplicates)

```json
{
  "imported": 0,
  "skipped": 10,
  "skipped_details": [
    {"row": 1, "reason": "Duplicate phone_number"},
    ...
  ]
}
```

---

### Scenario 4: Mixed Valid/Invalid Contacts
```json
{
  "contacts": [
    {"phone_number": "+15551111111", "name": "John"},
    {"phone_number": ""},  // Invalid - empty
    {"name": "Jane"},      // Invalid - no phone
    {"phone_number": "+15551111111"}  // Duplicate
  ]
}
```

**Result:**
```json
{
  "added": 1,
  "skipped": 3,
  "skipped_details": [
    {"reason": "Empty phone_number"},
    {"reason": "Missing or invalid phone_number"},
    {"reason": "Contact already exists in this chatroom"}
  ]
}
```

---

## Frontend Display Logic

### Option 1: Fallback to Phone Number
```javascript
const displayName = contact.name !== 'Unknown' 
  ? contact.name 
  : contact.phone_number;
```

### Option 2: Show Both
```jsx
<div className="contact-item">
  <strong>{contact.name || 'Unknown'}</strong>
  <span className="phone">{contact.phone_number}</span>
</div>
```

### Option 3: Editable Name
```jsx
{contact.name === 'Unknown' ? (
  <input 
    placeholder="Enter name..." 
    onBlur={(e) => updateContactName(contact.id, e.target.value)}
  />
) : (
  <strong>{contact.name}</strong>
)}
```

---

## Database Migration

### If you already have contacts table:
```sql
-- Make name nullable
ALTER TABLE contacts 
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN name SET DEFAULT 'Unknown';

-- Update existing empty names
UPDATE contacts 
SET name = 'Unknown' 
WHERE name IS NULL OR name = '';

-- Add unique constraint (optional)
CREATE UNIQUE INDEX idx_contacts_unique_phone_chatroom 
  ON contacts(phone_number, chatroom_id);
```

---

## Testing Checklist

- [ ] Add contact with only phone_number
- [ ] Add contact with all fields
- [ ] Import CSV with missing names
- [ ] Import CSV with missing emails
- [ ] Import same CSV twice (check duplicates)
- [ ] Send SMS from unknown number (check auto-create)
- [ ] Try to add duplicate contact manually
- [ ] Verify `name: "Unknown"` displays correctly in UI
- [ ] Test email lowercase sanitization
- [ ] Verify tags parsing from CSV

---

## Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 400 | Missing phone_number | Add phone_number field |
| 400 | No valid contacts | Check CSV format or contact data |
| 404 | Chatroom not found | Verify chatroom UUID |
| 500 | Database error | Check Supabase logs |

---

## Files Updated

✅ `src/MessageHub/pages/api/chatrooms/[id]/contacts.js`  
✅ `src/MessageHub/pages/api/chatrooms/import-csv.js`  
✅ `src/MessageHub/pages/api/messages/inbound/index.js`  
✅ `supabase-schema.sql`  
✅ `migration-allow-nullable-names.sql` (new)  
✅ `test-contacts.csv` (updated with missing names)  
✅ `CONTACT_HANDLING_UPDATES.md` (new documentation)

---

**Questions? Check `CONTACT_HANDLING_UPDATES.md` for detailed explanations.**
