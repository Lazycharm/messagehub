# Quick Deployment Commands for MessageHub
# Copy and paste these commands into your SSH terminal

# ============================================
# PART 1: INITIAL SETUP (Run Once)
# ============================================

# 1. Update system
apt-get update && apt-get upgrade -y

# 2. Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node -v  # Should show v18.x.x

# 3. Install PM2
npm install -g pm2
pm2 startup systemd

# 4. Install Nginx
apt-get install -y nginx git
systemctl enable nginx
systemctl start nginx

# 5. Create app directory
mkdir -p /var/www/messagehub
cd /var/www/messagehub

# ============================================
# PART 2: DEPLOY APPLICATION
# ============================================

# 6. Clone repository (or upload files)
git clone https://github.com/Lazycharm/massagehub-client.git .
# OR if already cloned: git pull origin main

# 7. Install dependencies
npm install --production

# 8. Create environment file
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
NODE_ENV=production
PORT=3000
EOF

# IMPORTANT: Edit with your actual credentials
nano .env.local

# 9. Build application
npm run build

# 10. Create PM2 config
cat > ecosystem.config.js << 'EOF'
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
EOF

# 11. Start with PM2
pm2 delete messagehub 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 list

# ============================================
# PART 3: CONFIGURE NGINX
# ============================================

# 12. Create Nginx config
cat > /etc/nginx/sites-available/messagehub << 'EOF'
server {
    listen 80;
    server_name _;

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
}
EOF

# 13. Enable site
ln -sf /etc/nginx/sites-available/messagehub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# 14. Configure firewall
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp

# ============================================
# VERIFICATION
# ============================================

echo "✅ Deployment Complete!"
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Access your app at: http://89.116.33.117"
echo ""
echo "Useful commands:"
echo "  pm2 logs messagehub    - View logs"
echo "  pm2 restart messagehub - Restart app"
echo "  pm2 monit              - Monitor"

# ============================================
# QUICK UPDATE (Future deployments)
# ============================================

# For future updates, just run:
# cd /var/www/messagehub
# git pull origin main
# npm install --production
# npm run build
# pm2 restart messagehub
