# Manual Deployment Instructions

## Step 1: SSH into your VPS
```
ssh root@89.116.33.117
```
Password: `Mynew+123123`

## Step 2: Install Node.js (if not installed)
```bash
# Check if Node.js is installed
node --version

# If not installed, run:
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Git
apt-get install -y git
```

## Step 3: Clone the repository
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Lazycharm/massagehub-client.git
cd messagehub-client
```

## Step 4: Create environment file
```bash
nano .env.local
```

Paste this content:
```
NEXT_PUBLIC_SUPABASE_URL=https://yudnnwdvrqcuonjblobr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZG5ud2R2cnFjdW9uamJsb2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzQxNzUsImV4cCI6MjA3ODcxMDE3NX0.Rt0MXmEJ6irPffMkui1z1s6FcuxvzZtXz8cRBZQ3w9o
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Save with `Ctrl+X`, then `Y`, then `Enter`

## Step 5: Install dependencies and build
```bash
cd /var/www/messagehub-client
npm install
npm run build
```

## Step 6: Start with PM2
```bash
pm2 start npm --name messagehub-client -- start
pm2 save
pm2 startup systemd
```

## Step 7: Check status
```bash
pm2 status
pm2 logs messagehub-client
```

## Your app should now be running at:
**http://89.116.33.117:3000**

## Future deployments (update code):
```bash
cd /var/www/messagehub-client
git pull origin main
npm install
npm run build
pm2 restart messagehub-client
```

## Useful PM2 commands:
- `pm2 status` - Check app status
- `pm2 logs messagehub-client` - View logs
- `pm2 restart messagehub-client` - Restart app
- `pm2 stop messagehub-client` - Stop app
- `pm2 delete messagehub-client` - Remove from PM2
