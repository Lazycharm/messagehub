#!/bin/bash
set -e

echo "=== Installing Node.js and dependencies ==="
apt-get update
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
if ! command -v git &> /dev/null; then
    apt-get install -y git
fi

echo ""
echo "=== Cloning/updating repository ==="
if [ -d "/var/www/messagehub-client" ]; then
    cd /var/www/messagehub-client
    git pull origin main
else
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/Lazycharm/massagehub-client.git
    cd messagehub-client
fi

echo ""
echo "=== Creating environment file ==="
cat > /var/www/messagehub-client/.env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://yudnnwdvrqcuonjblobr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZG5ud2R2cnFjdW9uamJsb2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzQxNzUsImV4cCI6MjA3ODcxMDE3NX0.Rt0MXmEJ6irPffMkui1z1s6FcuxvzZtXz8cRBZQ3w9o
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ENVEOF

echo ""
echo "=== Installing npm packages ==="
cd /var/www/messagehub-client
npm install

echo ""
echo "=== Building application ==="
npm run build

echo ""
echo "=== Starting with PM2 ==="
pm2 stop messagehub-client 2>/dev/null || true
pm2 delete messagehub-client 2>/dev/null || true
pm2 start npm --name messagehub-client -- start
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "=== Deployment Complete ==="
echo "App running at: http://89.116.33.117:3000"
pm2 status
