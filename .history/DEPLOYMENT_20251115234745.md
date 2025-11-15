# MessageHub - Server Deployment Guide

## 🚀 Quick Deployment

**Server:** 89.116.33.117  
**User:** root  
**Method:** PM2 + Nginx + Next.js

---

## Automated Deployment

### Step 1: Upload Files to Server

From your local machine:

```bash
# Option A: Using SCP
scp -r * root@89.116.33.117:/var/www/messagehub/

# Option B: Using Git (Recommended)
# On server:
cd /var/www
git clone https://github.com/Lazycharm/massagehub-client.git messagehub
cd messagehub
```

### Step 2: Run Deployment Script

```bash
# On your server (via SSH):
cd /var/www/messagehub
chmod +x deploy.sh
./deploy.sh
```

The script will automatically:
- ✅ Install Node.js 18
- ✅ Install PM2 process manager
- ✅ Install Nginx reverse proxy
- ✅ Install dependencies
- ✅ Build Next.js app
- ✅ Configure PM2
- ✅ Configure Nginx
- ✅ Start application
- ✅ Setup firewall

---

## Manual Deployment Steps

### 1. Connect to Server

```bash
ssh root@89.116.33.117
```

### 2. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
node -v  # Should show v18.x.x
npm -v   # Should show 9.x.x or higher
```

### 3. Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd
```

### 4. Install Nginx

```bash
apt-get update
apt-get install -y nginx

# Enable nginx
systemctl enable nginx
systemctl start nginx
```

### 5. Create Application Directory

```bash
mkdir -p /var/www/messagehub
cd /var/www/messagehub
```

### 6. Upload Your Code

**Option A: Git Clone**
```bash
git clone https://github.com/Lazycharm/massagehub-client.git .
```

**Option B: SCP from local machine**
```bash
# From your local machine (Windows PowerShell):
scp -r C:\messagehub-client\* root@89.116.33.117:/var/www/messagehub/
```

### 7. Install Dependencies

```bash
cd /var/www/messagehub
npm install --production
```

### 8. Configure Environment Variables

```bash
nano .env.local
```

Add your configuration:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Twilio (Optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# Environment
NODE_ENV=production
PORT=3000
```

### 9. Build Application

```bash
npm run build
```

### 10. Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'messagehub',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/messagehub',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### 11. Start Application

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 list
```

### 12. Configure Nginx

Create nginx config:

```bash
nano /etc/nginx/sites-available/messagehub
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site:

```bash
ln -s /etc/nginx/sites-available/messagehub /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 13. Configure Firewall

```bash
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
```

---

## Verification

### Check Application Status

```bash
# PM2 status
pm2 status

# View logs
pm2 logs messagehub

# Monitor resources
pm2 monit
```

### Check Nginx

```bash
systemctl status nginx
nginx -t
```

### Test Application

```bash
# Local test
curl http://localhost:3000

# External test (from your machine)
curl http://89.116.33.117
```

Open browser: **http://89.116.33.117**

---

## Post-Deployment

### 1. Apply Database Migrations

SSH to server and run:

```bash
# Copy migration content to server
nano /tmp/001_user_tokens.sql
# Paste content from supabase-migrations/001_user_tokens.sql

nano /tmp/002_user_chatrooms.sql
# Paste content from supabase-migrations/002_user_chatrooms.sql
```

Then apply in Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. SQL Editor
3. Run each migration file

### 2. Create Admin User

In Supabase Dashboard:
1. Authentication → Users → Add User
2. Email: your-email@domain.com
3. Password: YourSecurePassword
4. Auto-confirm: ✅

Then promote to admin:

```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@domain.com';
```

### 3. Test Login

1. Open http://89.116.33.117/Login
2. Enter credentials
3. Should redirect to Dashboard

---

## SSL/HTTPS Setup (Optional)

### Using Let's Encrypt

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
certbot --nginx -d yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

Update nginx config will be automatic.

---

## Useful Commands

### PM2 Commands

```bash
# View all processes
pm2 list

# View logs
pm2 logs messagehub
pm2 logs messagehub --lines 100

# Restart application
pm2 restart messagehub

# Stop application
pm2 stop messagehub

# Delete from PM2
pm2 delete messagehub

# Monitor resources
pm2 monit

# Save current PM2 config
pm2 save

# View detailed info
pm2 show messagehub
```

### Nginx Commands

```bash
# Test configuration
nginx -t

# Reload configuration
systemctl reload nginx

# Restart nginx
systemctl restart nginx

# View status
systemctl status nginx

# View error logs
tail -f /var/log/nginx/error.log

# View access logs
tail -f /var/log/nginx/access.log
```

### Application Updates

```bash
# Pull latest code
cd /var/www/messagehub
git pull origin main

# Install any new dependencies
npm install --production

# Rebuild
npm run build

# Restart
pm2 restart messagehub
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs messagehub --lines 50

# Check if port 3000 is in use
netstat -tlnp | grep 3000

# Check environment variables
pm2 show messagehub
```

### Nginx 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check nginx logs
tail -f /var/log/nginx/error.log

# Verify proxy settings
nginx -t
```

### Can't Access from Browser

```bash
# Check firewall
ufw status

# Check nginx is running
systemctl status nginx

# Check app is running
pm2 status

# Test locally
curl http://localhost:3000
```

### Database Connection Issues

```bash
# Check .env.local exists
cat /var/www/messagehub/.env.local

# Restart app after env changes
pm2 restart messagehub --update-env
```

---

## Monitoring

### Setup PM2 Monitoring (Optional)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Log Locations

- **PM2 logs:** `~/.pm2/logs/`
- **Nginx access:** `/var/log/nginx/access.log`
- **Nginx error:** `/var/log/nginx/error.log`
- **Application:** `pm2 logs messagehub`

---

## Backup

### Database Backup

Supabase provides automatic backups. To export:

```bash
# Use Supabase Dashboard → Database → Backups
```

### Application Backup

```bash
# Backup directory
tar -czf messagehub-backup-$(date +%Y%m%d).tar.gz /var/www/messagehub

# Backup to remote
scp messagehub-backup-*.tar.gz user@backup-server:/backups/
```

---

## Performance Tuning

### PM2 Cluster Mode (Multiple Instances)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'messagehub',
    script: 'npm',
    args: 'start',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
```

### Nginx Caching

Add to nginx config:

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 1h;
    # ... rest of config
}
```

---

## Security Checklist

- [ ] SSH key-based authentication enabled
- [ ] Root login disabled (optional)
- [ ] Firewall configured (UFW)
- [ ] HTTPS/SSL enabled
- [ ] Strong passwords for all services
- [ ] Regular security updates
- [ ] Supabase RLS enabled
- [ ] Environment variables secured
- [ ] Nginx security headers configured

---

**Deployment Status:** Ready ✅  
**Server IP:** 89.116.33.117  
**Application Port:** 3000  
**Reverse Proxy:** Nginx (Port 80/443)  
**Process Manager:** PM2
