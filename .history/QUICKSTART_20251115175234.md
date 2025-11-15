# MessageHub - Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Supabase project created
- Twilio account (optional, for SMS)

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create `.env.local` in the root directory:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Twilio (Optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
```

### 3. Database Setup
Run these SQL migrations in your Supabase SQL Editor:

**Step 1:** Apply user_tokens migration
```bash
# Copy contents of: supabase-migrations/001_user_tokens.sql
# Paste into Supabase SQL Editor and execute
```

**Step 2:** Apply user_chatrooms migration
```bash
# Copy contents of: supabase-migrations/002_user_chatrooms.sql
# Paste into Supabase SQL Editor and execute
```

### 4. Create Admin User
After signing up via the app, promote a user to admin:
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

## Running the Application

### Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
npm start
```

## First Login

### Default Test Account
If you don't have Supabase Auth configured yet, create a user in Supabase:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" (manual)
3. Enter email and password
4. User will automatically get:
   - A profile in `users` table
   - 100 initial tokens
   - Role: `agent` (promote to admin if needed)

### Login URL
```
http://localhost:3000/Login
```

## Key Features

### For Admins
1. **Token Management** - `/admin/AdminTokens`
   - View all user token balances
   - Adjust balances (+10/-10 quick buttons)
   - Custom balance editing
   
2. **Chatroom Access Control** - `/admin/AdminChatroomAccess`
   - Assign users to specific chatrooms
   - View chatroom assignments
   - Remove user access

3. **User Management** - `/admin/AdminUsers`
   - View all users
   - Manage roles (admin/agent)

### For All Users
- **Dashboard** - Analytics and recent messages
- **Contacts** - Manage contacts by chatroom
- **Groups** - Contact groups
- **Send SMS** - Send messages (costs 1 token per SMS)
- **Inbox** - Real-time message inbox
- **Templates** - Message templates

## Token System

### How It Works
- **New Users:** 100 tokens automatically
- **Admins:** Unlimited tokens (no deduction)
- **Agents:** 1 token deducted per SMS sent
- **Insufficient Tokens:** Error 402 returned

### Managing Tokens (Admin Only)
1. Navigate to `/admin/AdminTokens`
2. Find user in list
3. Use +10/-10 buttons or enter custom amount
4. Click "Save" to update

## Permission System

### Roles
- **Admin:** Full access to all chatrooms and data
- **Agent:** Access only to assigned chatrooms

### Assigning Chatrooms (Admin Only)
1. Navigate to `/admin/AdminChatroomAccess`
2. Select user from dropdown
3. Select chatroom from dropdown
4. Click "Assign"
5. User can now see that chatroom's data

### What Gets Filtered
When a user is logged in as an agent:
- **Chatrooms:** Only assigned ones visible
- **Contacts:** Only from assigned chatrooms
- **Messages:** Only from assigned chatrooms
- **Inbox:** Only inbound messages from assigned chatrooms

## Real-Time Messaging

### How It Works
- Inbox page subscribes to `inbound_messages` table
- New messages appear automatically (no refresh)
- Green "Live" indicator shows connection status
- Uses Supabase Realtime (websockets)

### Connection Status
- 🟢 **Live (Green Wifi Icon):** Real-time connected
- 🔴 **Offline (Gray Icon):** Disconnected

## API Authentication

All API endpoints (except webhooks) require authentication:

### Headers Required
```javascript
Authorization: Bearer <token>
```

### Getting Token
Token is stored in:
1. `localStorage.getItem('sb-access-token')`
2. Cookie: `sb-access-token` (httpOnly)

### Example API Call
```javascript
const token = localStorage.getItem('sb-access-token');
const response = await fetch('/api/messages', {
  headers: {
    'Authorization': token ? `Bearer ${token}` : '',
  },
});
```

## Database Schema

### Key Tables
1. **users**
   - `id` (UUID, PK)
   - `email` (text)
   - `name` (text)
   - `role` (text: 'admin' or 'agent')

2. **user_tokens**
   - `user_id` (UUID, PK, FK → users.id)
   - `balance` (integer, default 100)
   - Auto-initialized for new users

3. **user_chatrooms** (Pivot Table)
   - `user_id` (UUID, FK → users.id)
   - `chatroom_id` (UUID, FK → chatrooms.id)
   - Unique constraint on (user_id, chatroom_id)

4. **chatrooms**
   - `id` (UUID, PK)
   - `name` (text)
   - `twilio_number` (text)

5. **messages**
   - `id` (UUID, PK)
   - `chatroom_id` (UUID, FK)
   - `content` (text)
   - `from_number` (text)
   - `to_number` (text)

6. **inbound_messages**
   - `id` (UUID, PK)
   - `chatroom_id` (UUID, FK)
   - `from_number` (text)
   - `content` (text)

## Troubleshooting

### Can't Login
1. Check Supabase Auth is enabled
2. Verify user exists in Supabase Dashboard
3. Check `.env.local` has correct credentials
4. Clear browser cache and cookies

### No Chatrooms Visible (Agent)
- Admin must assign you to chatrooms
- Check `/admin/AdminChatroomAccess` (admin only)

### Token Deduction Not Working
1. Verify `user_tokens` table exists
2. Check user has token balance > 0
3. Admins are exempt from deduction
4. Check console for errors

### Real-Time Not Working
1. Verify Supabase Realtime is enabled
2. Check browser console for subscription status
3. Look for green "Live" indicator in Inbox
4. Refresh page to reconnect

### 401 Unauthorized Errors
1. Login again (session expired)
2. Check token in localStorage
3. Verify cookie is set
4. Clear cache and re-login

## Production Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables (Production)
Set these in your hosting platform:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

### Post-Deployment Checklist
- [ ] Database migrations applied
- [ ] Admin user created
- [ ] Environment variables set
- [ ] Twilio webhooks updated (if using SMS)
- [ ] HTTPS enabled (for secure cookies)
- [ ] Test login flow
- [ ] Test token system
- [ ] Test chatroom assignments
- [ ] Test real-time inbox

## Support & Documentation
- **Full Implementation Summary:** See `IMPLEMENTATION_SUMMARY.md`
- **API Documentation:** See inline comments in `/pages/api/`
- **Database Migrations:** See `/supabase-migrations/`

## Quick Commands

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint
```

---

**Version:** 1.0.0  
**Last Updated:** November 2024  
**Status:** Production Ready ✅
