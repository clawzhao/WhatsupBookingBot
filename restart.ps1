# Restart Services Script for Swimming Booking Bot
# This script kills any existing service on port 3000 and restarts the backend and frontend.

Write-Host "--- Restarting Services ---" -ForegroundColor Cyan

# 1. Kill Node.js and Flutter processes aggressively
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM dart.exe /T 2>$null
taskkill /F /IM flutter.exe /T 2>$null
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Stop-Process -Name dart -Force -ErrorAction SilentlyContinue

# 2. Check ports just in case
foreach ($port in @(3000, 5000, 5100)) {
    $processId = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
    if ($processId) {
        Write-Host "Killing process $processId on port $port..." -ForegroundColor Gray
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
}

# 3. Start Node Backend
Write-Host "Starting Node.js Backend..." -ForegroundColor Green
Start-Process node -ArgumentList "src/index.js" -WindowStyle Hidden -WorkingDirectory $PSScriptRoot

# 4. Start Public Dashboards on Ports 5000 and 5100
Write-Host "Starting Static Dashboards..." -ForegroundColor Green
Start-Process npx.cmd -ArgumentList "serve -p 5000 public" -WindowStyle Hidden -WorkingDirectory $PSScriptRoot
Start-Process npx.cmd -ArgumentList "serve -p 5100 public" -WindowStyle Hidden -WorkingDirectory $PSScriptRoot

# 5. Start Flutter Admin (if available) on Port 5050 (alternative)
if (Test-Path "flutter_admin") {
    Write-Host "Starting Flutter Admin Dashboard (if possible) on port 5050..." -ForegroundColor Green
    Start-Process cmd -ArgumentList "/c flutter run -d chrome --web-port 5050" -WindowStyle Hidden -WorkingDirectory "$PSScriptRoot\flutter_admin"
}

Write-Host "`nAll services are starting in the background." -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3000"
Write-Host "Admin Dashboard: http://localhost:5000/coaches.html"
Write-Host "Secondary Dashboard: http://localhost:5100"
Write-Host "`nUse 'Get-Job' to check status or 'Stop-Job' to stop them."
