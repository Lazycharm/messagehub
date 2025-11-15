# 📱 MessageHub - SMS & Email Management System

A full-featured messaging platform built with **React**, **Next.js**, and **Supabase** for managing SMS and email communications through chatrooms.

## 🚀 Features

- ✅ **Chatroom Management** - Create and manage multiple chatrooms with dedicated Twilio numbers
- ✅ **Contact Management** - Add contacts individually or bulk import via CSV
- ✅ **Inbound Message Handling** - Twilio webhook integration for receiving SMS
- ✅ **Message Storage** - All messages stored in Supabase with full history
- ✅ **User Management** - Multi-user support with chatroom assignments
- ✅ **Templates** - Pre-built SMS/email templates for quick sending
- ✅ **Groups** - Organize contacts into groups for targeted messaging
- ✅ **Admin Panel** - Manage sender numbers, settings, and message logs

## 📁 Project Structure

```
messagehub-client/
├── src/MessageHub/
│   ├── components/          # React components
│   │   ├── admin/          # Admin components
│   │   ├── chatrooms/      # Chatroom UI
│   │   ├── contacts/       # Contact management
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── groups/         # Group management
│   │   ├── inbox/          # Message inbox
│   │   ├── templates/      # Template editor
│   │   └── ui/             # Reusable UI components
│   ├── entities/           # JSON schemas
│   ├── lib/                # Utilities
│   │   └── supabaseClient.js
│   ├── pages/              # Next.js pages
│   │   ├── api/           # API routes
│   │   │   ├── chatrooms/
│   │   │   │   ├── index.js
│   │   │   │   ├── [id]/contacts.js
│   │   │   │   └── import-csv.js
│   │   │   └── messages/
│   │   │       └── inbound/
│   │   │           └── index.js
│   │   ├── admin/
│   │   └── ...
│   ├── Layout.js
│   └── globals.css
├── .env.local              # Environment variables
├── package.json
├── API_TESTING_GUIDE.md    # API testing documentation
├── supabase-schema.sql     # Database schema
└── test-contacts.csv       # Sample CSV for imports
```

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

Required packages:
- `@supabase/supabase-js` - Supabase client
- `formidable` - File upload handling
- `csv-parse` - CSV parsing

### 2. Configure Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the `supabase-schema.sql` file
3. Get your project URL and anon key from Settings → API

### 3. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📡 API Endpoints

### Chatrooms

**GET** `/api/chatrooms` - List all chatrooms  
**POST** `/api/chatrooms` - Create new chatroom

```json
{
  "name": "Support Team",
  "twilio_number": "+15551234567"
}
```

### Contacts

**PATCH** `/api/chatrooms/[id]/contacts` - Add contacts to chatroom

```json
{
  "contacts": [
    {
      "name": "John Doe",
      "phone_number": "+15559876543",
      "email": "john@example.com",
      "tags": ["vip", "customer"]
    }
  ]
}
```

### CSV Import

**POST** `/api/chatrooms/import-csv` - Import contacts from CSV

Form data:
- `file` - CSV file
- `chatroomId` - Target chatroom UUID

### Inbound Messages

**POST** `/api/messages/inbound` - Twilio webhook endpoint  
**GET** `/api/messages/inbound` - Fetch all inbound messages

## 🔧 Twilio Integration

### Configure Webhook

1. Go to Twilio Console → Phone Numbers
2. Select your number
3. Under "Messaging", set webhook URL:
   ```
   https://your-domain.com/api/messages/inbound
   ```
4. Set HTTP method to `POST`

### Webhook Payload

Twilio sends these parameters:
- `From` - Sender's phone number
- `To` - Your Twilio number
- `Body` - Message content

The API automatically:
- Matches `To` number with a chatroom
- Stores message in `inbound_messages` table
- Updates `messages` table for unified inbox
- Returns TwiML response to Twilio

## 📊 Database Schema

### Core Tables

- **chatrooms** - Chatroom configurations with Twilio numbers
- **contacts** - Contact information linked to chatrooms
- **messages** - All sent/received messages
- **inbound_messages** - Inbound SMS from Twilio
- **users** - System users
- **user_chatrooms** - User-chatroom access (many-to-many)

### Supporting Tables

- **templates** - Message templates
- **settings** - App settings
- **sender_numbers** - Outbound number pool
- **groups** - Contact groups
- **group_members** - Group membership

See `supabase-schema.sql` for complete schema with indexes and views.

## 🧪 Testing

### Quick Test Flow

1. **Create a chatroom:**
   ```bash
   curl -X POST http://localhost:3000/api/chatrooms \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Room", "twilio_number": "+15551234567"}'
   ```

2. **Import contacts:**
   ```bash
   curl.exe -X POST http://localhost:3000/api/chatrooms/import-csv \
     -F "file=@test-contacts.csv" \
     -F "chatroomId=YOUR_CHATROOM_ID"
   ```

3. **Simulate inbound SMS:**
   ```bash
   curl -X POST http://localhost:3000/api/messages/inbound \
     -d "From=%2B15559999999&To=%2B15551234567&Body=Test%20message"
   ```

See `API_TESTING_GUIDE.md` for comprehensive testing instructions.

## 🔐 Security

- ✅ UUID-based IDs
- ✅ Input validation and sanitization
- ✅ SQL injection protection via Supabase client
- ✅ Error handling with proper status codes
- ✅ Optional Row Level Security (RLS) policies in schema

### Enable RLS (Recommended for Production)

Uncomment RLS policies in `supabase-schema.sql` and customize based on your auth requirements.

## 📦 Tech Stack

- **Frontend**: React, Next.js
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **File Upload**: Formidable
- **CSV Parsing**: csv-parse
- **SMS Provider**: Twilio

## 🎨 Components

### UI Components (Reusable)
- Alert, Badge, Button, Calendar
- Card, Dropdown Menu, Input, Label
- Popover, Select, Tabs, Textarea

### Feature Components
- **Admin**: SenderNumberForm
- **Chatrooms**: ChatRoomSidebar, ChatRoomMessages, ChatRoomContacts
- **Contacts**: ContactForm, ContactsTable, BulkImport
- **Dashboard**: StatsCard, RecentMessages
- **Groups**: GroupForm, ManageGroupMembers
- **Inbox**: InboxMessageDetail
- **Templates**: TemplateForm

## 🚧 Future Enhancements

- [ ] Real-time message updates via Supabase subscriptions
- [ ] Outbound SMS sending
- [ ] Email integration
- [ ] Message scheduling
- [ ] Analytics dashboard
- [ ] Advanced filtering and search
- [ ] Message threading by contact
- [ ] Auto-reply rules
- [ ] Contact tagging system
- [ ] Export conversations

## 📝 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues or questions:
- Check `API_TESTING_GUIDE.md` for troubleshooting
- Review Supabase logs for database errors
- Verify Twilio webhook configuration
- Check browser console for frontend errors

---

**Built with ❤️ using React, Next.js, and Supabase**
