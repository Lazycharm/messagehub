# Real-Time Messaging Test Script
# Run this after starting your Next.js dev server

Write-Host "MessageHub Real-Time Test Script" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# Check if server is running
Write-Host "Checking if Next.js server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "✅ Server is running!`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start it with: npm run dev" -ForegroundColor Red
    exit 1
}

# Get chatroom ID from user
Write-Host "📋 Enter your chatroom ID (UUID):" -ForegroundColor Yellow
Write-Host "   (You can find this in Supabase → chatrooms table)" -ForegroundColor Gray
$chatroomId = Read-Host "Chatroom ID"

if ([string]::IsNullOrWhiteSpace($chatroomId)) {
    Write-Host "❌ No chatroom ID provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 Sending test message to chatroom: $chatroomId`n" -ForegroundColor Cyan

# Test message content
$testMessages = @(
    "Hello! This is test message #1 🎉",
    "Real-time messaging is working!",
    "This message should appear instantly ⚡",
    "Testing chatroom filtering...",
    "Final test message! 🏁"
)

# Send test messages
$messageNumber = 1
foreach ($content in $testMessages) {
    Write-Host "[$messageNumber/$($testMessages.Count)] Sending: $content" -ForegroundColor White
    
    $body = @{
        chatroom_id = $chatroomId
        content = $content
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/test/send-message" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body

        if ($response.success) {
            Write-Host "   ✅ Sent successfully!" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Warning: $($response.error)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Error: $_" -ForegroundColor Red
        Write-Host "   Response: $($_.Exception.Response)" -ForegroundColor Red
    }

    $messageNumber++
    Start-Sleep -Milliseconds 800
}

Write-Host "`n✅ Test complete!" -ForegroundColor Green
Write-Host "`n📊 What to check:" -ForegroundColor Cyan
Write-Host "   1. Open your browser console (F12)" -ForegroundColor White
Write-Host "   2. Look for: '🚀 Real-time message received:' logs" -ForegroundColor White
Write-Host "   3. Verify messages appear in the UI instantly" -ForegroundColor White
Write-Host "   4. Check the debug status bar shows '✅ Connected'" -ForegroundColor White

Write-Host "`n🧹 Clean up test messages:" -ForegroundColor Cyan
Write-Host "   Run this in Supabase SQL Editor:" -ForegroundColor White
Write-Host "   DELETE FROM messages WHERE from_number = '+15559999999';" -ForegroundColor Gray

Write-Host "`n📚 For detailed troubleshooting, see: REALTIME_TEST_GUIDE.md" -ForegroundColor Yellow
