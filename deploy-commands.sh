#!/bin/bash

# MessageHub Simple Deployment Commands
# Copy and paste these into your SSH session

echo "=== MessageHub Deployment ==="
echo "Server: 89.116.33.117"
echo ""

# 1. Install Node.js
echo "Step 1: Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 2. Install PM2
echo "Step 2: Installing PM2..."
npm install -g pm2

# 3. Install Git
echo "Step 3: Installing Git..."
apt-get install -y git

# 4. Clone repository
echo "Step 4: Cloning repository..."
mkdir -p /var/www
cd /var/www
if [ -d "messagehub-client" ]; then
    cd messagehub-client
    git pull origin main
else
    git clone https://github.com/Lazycharm/massagehub-client.git messagehub-client
    cd messagehub-client
fi

# 5. Create environment file
echo "Step 5: Creating .env.local..."
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://yudnnwdvrqcuonjblobr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZG5ud2R2cnFjdW9uamJsb2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzQxNzUsImV4cCI6MjA3ODcxMDE3NX0.Rt0MXmEJ6irPffMkui1z1s6FcuxvzZtXz8cRBZQ3w9o
NODE_ENV=production
EOF

# 6. Install dependencies
echo "Step 6: Installing dependencies..."
npm install

# 7. Build application
echo "Step 7: Building application..."
npm run build

# 8. Start with PM2
echo "Step 8: Starting application with PM2..."
pm2 delete messagehub-client 2>/dev/null || true
pm2 start npm --name messagehub-client -- start
pm2 save
pm2 startup

# 9. Install and configure Nginx
echo "Step 9: Installing Nginx..."
apt-get install -y nginx

# Create Nginx config
cat > /etc/nginx/sites-available/messagehub << 'NGINXEOF'
server {
    listen 80;
    server_name 89.116.33.117;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# Enable site
ln -sf /etc/nginx/sites-available/messagehub /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 10. Configure firewall
echo "Step 10: Configuring firewall..."
apt-get install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
yes | ufw enable

# Done!
echo ""
echo "================================"
echo "Deployment Complete!"
echo "================================"
echo ""
echo "Access your app at: http://89.116.33.117"
echo ""
echo "Check status:"
echo "  pm2 status"
echo "  pm2 logs messagehub-client"
echo ""
