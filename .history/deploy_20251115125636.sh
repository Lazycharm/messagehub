#!/bin/bash

# MessageHub Deployment Script
# This script deploys the Next.js app to the VPS

set -e

echo "🚀 Starting deployment to VPS..."

# Configuration
VPS_IP="89.116.33.117"
VPS_USER="root"
APP_NAME="messagehub-client"
APP_DIR="/var/www/$APP_NAME"
REPO_URL="https://github.com/Lazycharm/massagehub-client.git"

echo "📦 Installing dependencies on VPS..."

# Update system and install Node.js if not present
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    # Update package list
    apt-get update

    # Install Node.js 18.x if not installed
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi

    # Install PM2 globally if not installed
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        npm install -g pm2
    fi

    # Install git if not installed
    if ! command -v git &> /dev/null; then
        echo "Installing Git..."
        apt-get install -y git
    fi

    echo "✅ Dependencies installed"
ENDSSH

echo "📥 Cloning/updating repository..."

# Clone or pull the latest code
ssh $VPS_USER@$VPS_IP << ENDSSH
    if [ -d "$APP_DIR" ]; then
        echo "Updating existing repository..."
        cd $APP_DIR
        git pull origin main
    else
        echo "Cloning repository..."
        mkdir -p /var/www
        cd /var/www
        git clone $REPO_URL
        cd $APP_DIR
    fi

    echo "✅ Repository updated"
ENDSSH

echo "⚙️ Setting up environment variables..."

# You'll need to manually create .env.local on the server
echo "
⚠️  IMPORTANT: You need to create .env.local on the server with:
   
   NEXT_PUBLIC_SUPABASE_URL=https://yudnnwdvrqcuonjblobr.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
"

echo "📦 Installing Node modules and building..."

ssh $VPS_USER@$VPS_IP << ENDSSH
    cd $APP_DIR
    
    # Install dependencies
    npm install
    
    # Build the Next.js app
    npm run build
    
    echo "✅ Build complete"
ENDSSH

echo "🔄 Starting/Restarting application with PM2..."

ssh $VPS_USER@$VPS_IP << ENDSSH
    cd $APP_DIR
    
    # Stop existing PM2 process if running
    pm2 stop $APP_NAME 2>/dev/null || true
    pm2 delete $APP_NAME 2>/dev/null || true
    
    # Start the app with PM2
    pm2 start npm --name $APP_NAME -- start
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 to start on system boot
    pm2 startup systemd -u root --hp /root
    
    echo "✅ Application started"
ENDSSH

echo "🎉 Deployment complete!"
echo "Your app should be running on http://$VPS_IP:3000"
echo ""
echo "Useful commands:"
echo "  ssh $VPS_USER@$VPS_IP 'pm2 logs $APP_NAME'     - View logs"
echo "  ssh $VPS_USER@$VPS_IP 'pm2 restart $APP_NAME'  - Restart app"
echo "  ssh $VPS_USER@$VPS_IP 'pm2 status'             - Check status"
