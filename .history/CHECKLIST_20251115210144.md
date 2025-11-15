# MessageHub - Production Readiness Checklist

## 📋 Overview

This checklist ensures MessageHub is fully configured and ready for production use.

**Status Legend:**
- ✅ Complete
- ⚠️ Needs attention
- ❌ Not started
- 🔄 In progress

---

## 1️⃣ Environment Setup

### Local Development
- [x] ✅ Node.js 18+ installed
- [x] ✅ Dependencies installed (`npm install`)
- [x] ✅ `.env.local` configured
- [x] ✅ Dev server runs (`npm run dev`)
- [x] ✅ Build successful (`npm run build`)

### Environment Variables
- [ ] ⚠️ `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- [ ] ⚠️ `TWILIO_ACCOUNT_SID` - Twilio account SID (optional for now)
- [ ] ⚠️ `TWILIO_AUTH_TOKEN` - Twilio auth token (optional for now)

**Verify:**
```bash
# Check if environment variables are loaded
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Supabase URL loaded' : '❌ Missing Supabase URL')"
```

---

## 2️⃣ Database Configuration

### Supabase Project Setup
- [ ] ⚠️ Supabase project created
- [ ] ⚠️ Database accessible
- [ ] ⚠️ Connection string verified

### Migration 1: User Tokens System
- [ ] ❌ Applied `supabase-migrations/001_user_tokens.sql`
- [ ] ❌ Verified `user_tokens` table exists
- [ ] ❌ Verified `users.role` column exists
- [ ] ❌ Tested auto-initialization trigger

**Verification SQL:**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_tokens');

-- Should return: users, user_tokens
```

### Migration 2: User-Chatroom Permissions
- [ ] ❌ Applied `supabase-migrations/002_user_chatrooms.sql`
- [ ] ❌ Verified `user_chatrooms` table exists
- [ ] ❌ Verified unique constraint created
- [ ] ❌ Verified indexes created

**Verification SQL:**
```sql
-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'user_chatrooms';

-- Should return: idx_user_chatrooms_user_id, idx_user_chatrooms_chatroom_id
```

### Core Tables Check
- [ ] ⚠️ `users` - User profiles
- [ ] ⚠️ `chatrooms` - Chat workspaces
- [ ] ⚠️ `contacts` - Contact directory
- [ ] ⚠️ `messages` - Outbound messages
- [ ] ⚠️ `inbound_messages` - Inbound messages
- [ ] ⚠️ `groups` - Contact groups
- [ ] ⚠️ `group_members` - Group membership
- [ ] ⚠️ `templates` - Message templates
- [ ] ⚠️ `sender_numbers` - Twilio numbers
- [ ] ⚠️ `settings` - System settings

**Quick Test:**
```bash
npm run test:realtime
# Should pass "Database Connection" and "Database Tables" tests
```

---

## 3️⃣ Authentication Setup

### Supabase Auth Configuration
- [ ] ⚠️ Supabase Auth enabled in project
- [ ] ⚠️ Email auth provider enabled
- [ ] ⚠️ Confirm email disabled (or configured)
- [ ] ⚠️ JWT expiry configured (default: 3600s)

### Admin User Creation
- [ ] ❌ First user created via Supabase Dashboard
- [ ] ❌ User auto-confirmed (if email verification disabled)
- [ ] ❌ User profile exists in `users` table
- [ ] ❌ User promoted to admin role

**Steps:**
1. Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create new user"
3. Enter email and password
4. Check "Auto-confirm"
5. Click "Create user"

**Then run SQL:**
```sql
-- Promote to admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Verify
SELECT id, email, name, role FROM users;
```

### Login Flow Test
- [ ] ❌ Can access `/Login` page
- [ ] ❌ Can login with credentials
- [ ] ❌ Redirected to `/Dashboard` after login
- [ ] ❌ Token stored in localStorage
- [ ] ❌ Cookie set correctly
- [ ] ❌ Top bar shows user email
- [ ] ❌ Logout works and redirects

---

## 4️⃣ Token System Verification

### Token Initialization
- [ ] ❌ New users automatically get 100 tokens
- [ ] ❌ Existing users can have tokens added manually
- [ ] ❌ Token balance visible in top bar (💰 icon)

**Manual token grant (if needed):**
```sql
-- Add tokens for existing user
INSERT INTO user_tokens (user_id, balance)
VALUES ('user-id-here', 100)
ON CONFLICT (user_id) 
DO UPDATE SET balance = 100;
```

### Token Management (Admin)
- [ ] ❌ Can access `/admin/AdminTokens`
- [ ] ❌ Can view all user balances
- [ ] ❌ Can use +10/-10 quick adjust
- [ ] ❌ Can enter custom balance
- [ ] ❌ Stats display correctly (total users, tokens, avg)

### Token Deduction
- [ ] ❌ Agent users get 1 token deducted per SMS
- [ ] ❌ Admin users send unlimited (no deduction)
- [ ] ❌ 402 error when balance = 0
- [ ] ❌ Balance updates immediately after send
- [ ] ❌ Top bar shows updated balance

---

## 5️⃣ Permission System

### Chatroom Assignment (Admin)
- [ ] ❌ Can access `/admin/AdminChatroomAccess`
- [ ] ❌ Can view all chatrooms
- [ ] ❌ Can view all users
- [ ] ❌ Can assign user to chatroom
- [ ] ❌ Can remove user from chatroom
- [ ] ❌ Duplicate assignments prevented
- [ ] ❌ UI shows assigned users per chatroom

### Permission Filtering (Agent)
- [ ] ❌ Created test agent user
- [ ] ❌ Assigned agent to one chatroom
- [ ] ❌ Agent sees only assigned chatroom(s)
- [ ] ❌ Agent can't access unassigned chatrooms
- [ ] ❌ Messages filtered by accessible chatrooms
- [ ] ❌ Contacts filtered by accessible chatrooms
- [ ] ❌ Inbox filtered by accessible chatrooms

**Create test agent:**
```sql
-- In Supabase Auth, create user: agent@test.com
-- Then add to users table:
INSERT INTO users (id, email, name, role)
VALUES (
  'auth-user-id-from-dashboard', 
  'agent@test.com', 
  'Test Agent', 
  'agent'
);

-- Assign to one chatroom:
INSERT INTO user_chatrooms (user_id, chatroom_id)
VALUES (
  'agent-user-id',
  (SELECT id FROM chatrooms LIMIT 1)
);
```

### Admin Bypass
- [ ] ❌ Admin sees all chatrooms (no filtering)
- [ ] ❌ Admin can create chatrooms
- [ ] ❌ Admin can access all data
- [ ] ❌ Admin has all admin pages accessible

---

## 6️⃣ Real-Time Messaging

### Supabase Realtime Setup
- [ ] ⚠️ Realtime enabled in Supabase project
- [ ] ⚠️ Database replication enabled
- [ ] ⚠️ `inbound_messages` table replicated

**Enable replication:**
1. Supabase Dashboard → Database → Replication
2. Enable replication for `inbound_messages` table
3. Enable replication for `messages` table (optional)

### Real-Time Inbox Test
- [ ] ❌ Open `/Inbox`
- [ ] ❌ Green "Live" indicator visible (Wifi icon)
- [ ] ❌ Insert test message via SQL
- [ ] ❌ Message appears immediately (no refresh)
- [ ] ❌ Connection indicator updates on disconnect

**Test SQL:**
```sql
INSERT INTO inbound_messages (from_number, chatroom_id, content)
VALUES (
  '+15559998888',
  (SELECT id FROM chatrooms LIMIT 1),
  'Real-time test message'
);
```

---

## 7️⃣ Twilio Integration (Optional)

### Twilio Account Setup
- [ ] 🔄 Twilio account created
- [ ] 🔄 Account SID copied to `.env.local`
- [ ] 🔄 Auth token copied to `.env.local`
- [ ] 🔄 At least one phone number purchased

### Sender Numbers Configuration
- [ ] 🔄 Phone numbers added to `sender_numbers` table
- [ ] 🔄 Chatrooms linked to Twilio numbers

**Add Twilio number:**
```sql
INSERT INTO sender_numbers (phone_number, provider, status)
VALUES ('+15551234567', 'twilio', 'active');

-- Link to chatroom:
UPDATE chatrooms 
SET twilio_number = '+15551234567'
WHERE id = 'chatroom-id-here';
```

### SMS Sending Test
- [ ] 🔄 Can access `/SendSMS`
- [ ] 🔄 Can select chatroom (uses its Twilio number)
- [ ] 🔄 Can enter recipient number
- [ ] 🔄 Can compose message
- [ ] 🔄 SMS sends successfully
- [ ] 🔄 Token deducted (for agents)
- [ ] 🔄 Message saved to database
- [ ] 🔄 Twilio logs show message

### Inbound Webhook Setup
- [ ] 🔄 Webhook URL configured in Twilio
- [ ] 🔄 Format: `https://yourdomain.com/api/messages/inbound`
- [ ] 🔄 Receives inbound messages
- [ ] 🔄 Creates contact if unknown sender
- [ ] 🔄 Stores in `inbound_messages` table
- [ ] 🔄 Shows in Inbox with real-time update

---

## 8️⃣ Data Population

### Chatrooms
- [ ] ❌ At least 2 chatrooms created
- [ ] ❌ Each has name and description
- [ ] ❌ Twilio numbers assigned (if applicable)

**Sample data:**
```sql
INSERT INTO chatrooms (name, twilio_number, description)
VALUES 
  ('Support Team', '+15551234567', 'Customer support inquiries'),
  ('Sales Team', '+15557654321', 'Sales and partnerships'),
  ('Marketing', '+15559876543', 'Marketing campaigns');
```

### Contacts
- [ ] ❌ Sample contacts added
- [ ] ❌ Contacts linked to chatrooms
- [ ] ❌ Phone numbers in E.164 format

**Sample data:**
```sql
INSERT INTO contacts (name, phone_number, email, chatroom_id)
VALUES 
  ('John Doe', '+15551112222', 'john@example.com', (SELECT id FROM chatrooms WHERE name = 'Support Team')),
  ('Jane Smith', '+15553334444', 'jane@example.com', (SELECT id FROM chatrooms WHERE name = 'Sales Team'));
```

### Templates
- [ ] ❌ Message templates created
- [ ] ❌ Templates accessible from `/Templates`

**Sample data:**
```sql
INSERT INTO templates (name, content, type)
VALUES 
  ('Welcome Message', 'Welcome to our service! Reply HELP for assistance.', 'sms'),
  ('Follow-up', 'Thanks for contacting us. How can we help you today?', 'sms');
```

---

## 9️⃣ Admin Tools

### User Management
- [ ] ❌ Access `/admin/AdminUsers`
- [ ] ❌ View all users
- [ ] ❌ See user roles
- [ ] ❌ Can create new users (if implemented)

### Message Logs
- [ ] ❌ Access `/admin/AdminMessageLogs`
- [ ] ❌ View all messages
- [ ] ❌ Filter by type (SMS/Email)
- [ ] ❌ Search functionality works

### Sender Numbers
- [ ] ❌ Access `/admin/AdminSenderNumbers`
- [ ] ❌ View Twilio numbers
- [ ] ❌ Add/edit numbers
- [ ] ❌ See status (active/inactive)

### System Settings
- [ ] ❌ Access `/admin/AdminSettings`
- [ ] ❌ View configuration
- [ ] ❌ Update settings
- [ ] ❌ Changes persist

---

## 🔟 Testing & Quality

### Automated Tests
- [ ] ❌ Run `npm run test:realtime`
- [ ] ❌ All environment tests pass
- [ ] ❌ Database connection successful
- [ ] ❌ All tables accessible
- [ ] ❌ API routes responding
- [ ] ❌ Real-time subscription works

### Manual Testing
- [ ] ❌ Login/logout flow
- [ ] ❌ Admin page access (admin only)
- [ ] ❌ Token management
- [ ] ❌ Chatroom assignment
- [ ] ❌ Permission filtering (agent)
- [ ] ❌ Send SMS (if Twilio configured)
- [ ] ❌ Real-time inbox updates
- [ ] ❌ Contact management
- [ ] ❌ Template usage

### Browser Testing
- [ ] ❌ Chrome/Edge
- [ ] ❌ Firefox
- [ ] ❌ Safari
- [ ] ❌ Mobile responsive

### Error Handling
- [ ] ❌ 401 redirects to login
- [ ] ❌ 403 shows access denied
- [ ] ❌ 402 shows insufficient tokens
- [ ] ❌ Network errors display properly
- [ ] ❌ Form validation works

---

## 1️⃣1️⃣ Production Deployment

### Pre-Deployment
- [ ] 🔄 Environment variables configured
- [ ] 🔄 Database migrations applied
- [ ] 🔄 Admin user created
- [ ] 🔄 Build successful locally
- [ ] 🔄 No console errors
- [ ] 🔄 Tested all critical features

### Deployment Platform
- [ ] 🔄 Platform chosen (Vercel/Railway/etc)
- [ ] 🔄 Repository connected
- [ ] 🔄 Build settings configured
- [ ] 🔄 Environment variables set
- [ ] 🔄 Custom domain configured (optional)
- [ ] 🔄 SSL/HTTPS enabled

### Post-Deployment
- [ ] 🔄 Production URL accessible
- [ ] 🔄 Login works on production
- [ ] 🔄 Database connected
- [ ] 🔄 Real-time works
- [ ] 🔄 Twilio webhooks updated (if applicable)
- [ ] 🔄 Cookie security enabled
- [ ] 🔄 Error monitoring configured

### Security
- [ ] 🔄 HTTPS enforced
- [ ] 🔄 httpOnly cookies working
- [ ] 🔄 Supabase RLS enabled
- [ ] 🔄 API rate limiting (optional)
- [ ] 🔄 No secrets in client code
- [ ] 🔄 Twilio webhook signature validation

---

## 1️⃣2️⃣ Documentation

### User Documentation
- [ ] ✅ `SETUP_GUIDE.md` - Setup instructions
- [ ] ✅ `QUICKSTART.md` - Quick start guide
- [ ] ✅ `ARCHITECTURE.md` - System architecture
- [ ] ✅ `IMPLEMENTATION_SUMMARY.md` - Technical details
- [ ] ✅ `TEST_REPORT.md` - Test results

### Admin Documentation
- [ ] ✅ Token management guide (in SETUP_GUIDE.md)
- [ ] ✅ Chatroom assignment guide (in SETUP_GUIDE.md)
- [ ] ✅ User role management (in SETUP_GUIDE.md)
- [ ] ✅ Troubleshooting guide (in SETUP_GUIDE.md)

### Developer Documentation
- [ ] ✅ API endpoints documented (inline comments)
- [ ] ✅ Database schema documented (ARCHITECTURE.md)
- [ ] ✅ Authentication flow documented (ARCHITECTURE.md)
- [ ] ✅ Migration files documented

---

## 1️⃣3️⃣ Monitoring & Maintenance

### Monitoring Setup
- [ ] 🔄 Error logging configured
- [ ] 🔄 Performance monitoring
- [ ] 🔄atabase backup strategy
- [ ] 🔄 Uptime monitoring
- [ ] 🔄 Alert notifications

### Maintenance Plan
- [ ] 🔄 Regular database backups
- [ ] 🔄 Dependency updates schedule
- [ ] 🔄 Security patch process
- [ ] 🔄 User support process
- [ ] 🔄 Bug tracking system

---

## 📊 Progress Summary

**Total Tasks:** ~150  
**Completed:** ~40 (✅)  
**In Progress:** ~10 (🔄)  
**Needs Attention:** ~50 (⚠️)  
**Not Started:** ~50 (❌)  

**Critical Path (Must Complete):**
1. ⚠️ Apply database migrations
2. ⚠️ Create admin user
3. ⚠️ Test authentication flow
4. ⚠️ Verify token system
5. ⚠️ Test permission filtering

**Optional (Can Skip Initially):**
- 🔄 Twilio integration (can test with dummy data)
- 🔄 Production deployment (can use dev server)
- 🔄 Full browser testing (focus on Chrome first)

---

## 🎯 Next Actions

### Immediate (Do Now)
1. Run database migration `001_user_tokens.sql`
2. Run database migration `002_user_chatrooms.sql`
3. Create first admin user in Supabase
4. Promote user to admin role
5. Test login at http://localhost:3001/Login

### Short-term (This Week)
1. Create test chatrooms
2. Add sample contacts
3. Create test agent user
4. Test permission filtering
5. Configure Twilio (if sending SMS)

### Long-term (When Ready)
1. Production deployment
2. Custom domain setup
3. User onboarding
4. Team training
5. Go live! 🚀

---

**Last Updated:** November 15, 2024  
**Version:** 1.0.0  
**Status:** Development Ready ✅
