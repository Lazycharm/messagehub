# MessageHub Deployment Script for Windows
# Run this script to deploy your app to the VPS

$VPS_IP = "89.116.33.117"
$VPS_USER = "root"
$APP_NAME = "messagehub-client"
$APP_DIR = "/var/www/$APP_NAME"
$REPO_URL = "https://github.com/Lazycharm/massagehub-client.git"

Write-Host "🚀 Starting deployment to VPS..." -ForegroundColor Green
Write-Host ""

# Step 1: Install dependencies
Write-Host "📦 Installing dependencies on VPS..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" @"
apt-get update -qq
command -v node > /dev/null 2>&1 || (curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs)
command -v pm2 > /dev/null 2>&1 || npm install -g pm2
command -v git > /dev/null 2>&1 || apt-get install -y git
echo '✅ Dependencies installed'
"@

Write-Host ""

# Step 2: Clone/update repository
Write-Host "📥 Cloning/updating repository..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" @"
if [ -d '$APP_DIR' ]; then
    echo 'Updating existing repository...'
    cd $APP_DIR && git pull origin main
else
    echo 'Cloning repository...'
    mkdir -p /var/www && cd /var/www && git clone $REPO_URL
fi
echo '✅ Repository updated'
"@

Write-Host ""

# Step 3: Create .env.local
Write-Host "⚙️ Creating environment file..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" @"
cat > $APP_DIR/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://yudnnwdvrqcuonjblobr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZG5ud2R2cnFjdW9uamJsb2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzQxNzUsImV4cCI6MjA3ODcxMDE3NX0.Rt0MXmEJ6irPffMkui1z1s6FcuxvzZtXz8cRBZQ3w9o
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
EOF
echo '✅ Environment file created'
"@

Write-Host ""
Write-Host "⚠️  IMPORTANT: Update SUPABASE_SERVICE_ROLE_KEY in .env.local on the server!" -ForegroundColor Red
Write-Host ""

# Step 4: Install and build
Write-Host "📦 Installing dependencies and building..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" @"
cd $APP_DIR
npm install --production=false
npm run build
echo '✅ Build complete'
"@

Write-Host ""

# Step 5: Start with PM2
Write-Host "🔄 Starting application with PM2..." -ForegroundColor Yellow
ssh "$VPS_USER@$VPS_IP" @"
cd $APP_DIR
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start npm --name $APP_NAME -- start
pm2 save
pm2 startup systemd -u root --hp /root
echo '✅ Application started'
"@

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is running at: http://$VPS_IP:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  ssh $VPS_USER@$VPS_IP 'pm2 logs $APP_NAME'     - View logs"
Write-Host "  ssh $VPS_USER@$VPS_IP 'pm2 restart $APP_NAME'  - Restart app"
Write-Host "  ssh $VPS_USER@$VPS_IP 'pm2 status'             - Check status"
Write-Host ""
