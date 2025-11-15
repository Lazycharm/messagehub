# 🔧 Contact Handling Updates

## Overview
The MessageHub API has been updated to handle **contacts without names** (unknown callers, SMS replies, etc.) and prevent duplicate entries.

---

## ✅ What Changed

### 1. **Database Schema** (`supabase-schema.sql`)
- `contacts.name` is now **nullable** with default value `'Unknown'`
- Contacts can be created with only a `phone_number`

### 2. **API Route: `chatrooms/[id]/contacts.js`**
**Changes:**
- ✅ Name is **optional** (defaults to `'Unknown'`)
- ✅ Only `phone_number` is required
- ✅ **Duplicate prevention**: Checks if contact exists (same phone + chatroom)
- ✅ Email sanitization (trimmed, lowercased)
- ✅ Enhanced error reporting with skipped contacts

**Request Example:**
```json
{
  "contacts": [
    {
      "phone_number": "+15559876543",
      "name": "John Doe",
      "email": "john@example.com",
      "tags": ["vip"]
    },
    {
      "phone_number": "+15551234567"
      // No name, email, or tags - all optional!
    }
  ]
}
```

**Response Example:**
```json
{
  "message": "Contacts added successfully",
  "added": 1,
  "skipped": 1,
  "contacts": [
    {
      "id": "uuid-here",
      "name": "Unknown",
      "phone_number": "+15551234567",
      "email": null,
      "tags": [],
      "chatroom_id": "chatroom-uuid"
    }
  ],
  "skipped_details": [
    {
      "contact": {"phone_number": "+15559876543", "name": "John Doe"},
      "reason": "Contact already exists in this chatroom"
    }
  ]
}
```

### 3. **API Route: `chatrooms/import-csv.js`**
**Changes:**
- ✅ Name column is **optional** in CSV
- ✅ Email column is **optional**
- ✅ **Duplicate prevention**: Checks existing contacts before import
- ✅ **Row-level error tracking** with detailed skip reasons
- ✅ Email sanitization (trimmed, lowercased)
- ✅ Better CSV parsing with `relax_column_count`

**CSV Format** (all columns except phone_number are optional):
```csv
name,phone_number,email,tags
John Doe,+15551234567,john@example.com,"customer,vip"
,+15559876543,jane@example.com,prospect
Alice,+15558887777,,customer
,+15553334444,,"lead,priority"
```

**Response Example:**
```json
{
  "message": "Contacts imported successfully",
  "imported": 3,
  "skipped": 1,
  "total_rows": 4,
  "contacts": [...],
  "skipped_details": [
    {
      "row": 2,
      "reason": "Duplicate phone_number",
      "data": {"name": "", "phone_number": "+15559876543"}
    }
  ]
}
```

---

## 📋 Migration Steps

### For New Databases
Just run the updated `supabase-schema.sql` - name is already nullable.

### For Existing Databases
Run the migration file:
```bash
# In Supabase SQL Editor
cat migration-allow-nullable-names.sql
```

Or manually:
```sql
ALTER TABLE contacts 
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN name SET DEFAULT 'Unknown';

UPDATE contacts 
SET name = 'Unknown' 
WHERE name IS NULL OR name = '';
```

---

## 🧪 Testing

### Test 1: Add contact with only phone number
```bash
curl -X PATCH http://localhost:3000/api/chatrooms/YOUR_ID/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"phone_number": "+15559999999"}
    ]
  }'
```

**Expected:** Contact created with `name: "Unknown"`

### Test 2: Import CSV with missing names
```bash
curl.exe -X POST http://localhost:3000/api/chatrooms/import-csv \
  -F "file=@test-contacts.csv" \
  -F "chatroomId=YOUR_ID"
```

**Expected:** All rows imported, empty names become `"Unknown"`

### Test 3: Duplicate prevention
Import the same CSV twice - second import should skip duplicates:
```json
{
  "imported": 0,
  "skipped": 10,
  "skipped_details": [
    {"row": 1, "reason": "Duplicate phone_number", ...}
  ]
}
```

### Test 4: Add existing contact
```bash
curl -X PATCH http://localhost:3000/api/chatrooms/YOUR_ID/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {"phone_number": "+15559999999"},
      {"phone_number": "+15559999999"}
    ]
  }'
```

**Expected:** Only 1 added, 1 skipped (duplicate)

---

## 🎯 Use Cases

### 1. **Inbound SMS from Unknown Number**
When Twilio webhook receives SMS from new contact:
```javascript
// In your inbound webhook handler
await supabase.from('contacts').insert({
  phone_number: from_number, // From Twilio
  chatroom_id: matched_chatroom_id
  // No name needed!
});
```

### 2. **CSV Import with Partial Data**
Users can upload CSV files with only phone numbers:
```csv
phone_number
+15551111111
+15552222222
+15553333333
```

### 3. **Manual Contact Addition**
Admin adds contact with just phone number via UI form - name can be blank.

---

## ⚠️ Important Notes

### Validation Rules
- ✅ `phone_number` - **REQUIRED** (non-empty string)
- ⚪ `name` - Optional (defaults to `"Unknown"`)
- ⚪ `email` - Optional (sanitized to lowercase)
- ⚪ `tags` - Optional (defaults to empty array)

### Duplicate Detection
Duplicates are detected by: **`phone_number` + `chatroom_id`**

A contact can exist in multiple chatrooms, but not twice in the same chatroom.

### Display in UI
When rendering contacts in your frontend:
```javascript
// Fallback display logic
const displayName = contact.name && contact.name !== 'Unknown' 
  ? contact.name 
  : contact.phone_number;

// Or show both
<div>
  <strong>{contact.name || 'Unknown'}</strong>
  <small>{contact.phone_number}</small>
</div>
```

---

## 🔍 Error Handling

### Common Errors

**Missing phone_number:**
```json
{
  "error": "No valid contacts to add",
  "skipped": 1,
  "details": [
    {"contact": {...}, "reason": "Missing or invalid phone_number"}
  ]
}
```

**All duplicates:**
```json
{
  "error": "No valid contacts to add",
  "skipped": 5,
  "details": [
    {"contact": {...}, "reason": "Contact already exists in this chatroom"}
  ]
}
```

**CSV with no valid rows:**
```json
{
  "error": "No valid contacts found in CSV",
  "total_rows": 10,
  "skipped": 10,
  "skipped_details": [...]
}
```

---

## 🚀 Next Steps

1. **Run migration** if you have an existing database
2. **Update your frontend forms** to make name optional
3. **Test CSV imports** with the updated `test-contacts.csv`
4. **Update UI components** to handle `name: "Unknown"` gracefully
5. **Consider adding a feature** to update contact names later when they're identified

---

## 📊 Summary

| Feature | Before | After |
|---------|--------|-------|
| Name required | ✅ Yes | ❌ No (optional) |
| Duplicate prevention | ❌ No | ✅ Yes |
| Email sanitization | ⚪ Partial | ✅ Full (lowercase) |
| Skip tracking | ❌ No | ✅ Detailed |
| CSV flexibility | ⚪ Limited | ✅ Full |
| Default name value | N/A | ✅ "Unknown" |
