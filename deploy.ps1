# MessageHub Deployment Script for Windows
$VPS_IP = "89.116.33.117"
$VPS_USER = "root"

Write-Host "Starting deployment to VPS..." -ForegroundColor Green
Write-Host "This will SSH into your server and run the deployment commands." -ForegroundColor Yellow
Write-Host "Password: Mynew+123123" -ForegroundColor Gray
Write-Host ""

# Single SSH session with all commands
$commands = @'
echo "=== Installing Node.js and dependencies ==="
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
'@

Write-Host "Connecting to VPS and running deployment..." -ForegroundColor Yellow
Write-Host ""

ssh "${VPS_USER}@${VPS_IP}" $commands

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your app should be running at: http://$VPS_IP:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Update the SUPABASE_SERVICE_ROLE_KEY:" -ForegroundColor Red
Write-Host "  ssh $VPS_USER@$VPS_IP" -ForegroundColor Yellow
Write-Host "  nano /var/www/messagehub-client/.env.local" -ForegroundColor Yellow
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  ssh $VPS_USER@$VPS_IP 'pm2 logs messagehub-client'" -ForegroundColor Gray
Write-Host "  ssh $VPS_USER@$VPS_IP 'pm2 restart messagehub-client'" -ForegroundColor Gray
Write-Host "  ssh $VPS_USER@$VPS_IP 'pm2 status'" -ForegroundColor Gray
