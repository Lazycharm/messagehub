# Quick Deployment Script
# Run these commands in Git Bash or WSL

Write-Host "MessageHub Quick Deployment" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

$password = "Mynew+123123"
$server = "root@89.116.33.117"

Write-Host "This will deploy via SSH. Password: $password" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opening SSH connection..." -ForegroundColor Green
Write-Host ""

# Just open SSH - let user run commands manually
ssh $server
