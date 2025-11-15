# MessageHub Deployment Script for Windows
# Run this script to deploy your app to the VPS

$VPS_IP = "89.116.33.117"
$VPS_USER = "root"
$APP_NAME = "messagehub-client"
$APP_DIR = "/var/www/$APP_NAME"
$REPO_URL = "https://github.com/Lazycharm/massagehub-client.git"

Write-Host "Starting deployment to VPS..." -ForegroundColor Green
Write-Host ""

# Create deployment script on local machine
$deployScript = @'
#!/bin/bash
set -e

echo "Installing dependencies..."
apt-get update -qq
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

echo "Cloning/updating repository..."
if [ -d "/var/www/messagehub-client" ]; then
    cd /var/www/messagehub-client
    git pull origin main
else
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/Lazycharm/massagehub-client.git
    cd messagehub-client
fi

echo "Creating environment file..."
cat > /var/www/messagehub-client/.env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://yudnnwdvrqcuonjblobr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZG5ud2R2cnFjdW9uamJsb2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzQxNzUsImV4cCI6MjA3ODcxMDE3NX0.Rt0MXmEJ6irPffMkui1z1s6FcuxvzZtXz8cRBZQ3w9o
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ENVEOF

echo "Installing npm packages..."
cd /var/www/messagehub-client
npm install

echo "Building application..."
npm run build

echo "Starting with PM2..."
pm2 stop messagehub-client 2>/dev/null || true
pm2 delete messagehub-client 2>/dev/null || true
pm2 start npm --name messagehub-client -- start
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "Deployment complete!"
echo "App running at: http://89.116.33.117:3000"
'@

# Save script temporarily
$deployScript | Out-File -FilePath "deploy-remote.sh" -Encoding ASCII -NoNewline

# Copy script to VPS and execute
Write-Host "Uploading deployment script..." -ForegroundColor Yellow
scp deploy-remote.sh "$VPS_USER@$VPS_IP:/tmp/deploy.sh"

Write-Host "Executing deployment on VPS..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" "chmod +x /tmp/deploy.sh && /tmp/deploy.sh"

# Clean up local script
Remove-Item deploy-remote.sh

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Your app is running at: http://$VPS_IP:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Update SUPABASE_SERVICE_ROLE_KEY in .env.local on the server!" -ForegroundColor Red
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  ssh $VPS_USER@$VPS_IP 'pm2 logs $APP_NAME'     - View logs"
Write-Host "  ssh $VPS_USER@$VPS_IP 'pm2 restart $APP_NAME'  - Restart app"
Write-Host "  ssh $VPS_USER@$VPS_IP 'pm2 status'             - Check status"
