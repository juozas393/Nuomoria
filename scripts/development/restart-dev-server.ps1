# PowerShell script to properly restart dev server with cache clearing

Write-Host "🔄 Restarting dev server with cache clearing..." -ForegroundColor Cyan

# Stop any running dev server (if possible)
Write-Host "1. Stopping dev server..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.CommandLine -like "*react-scripts*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.CommandLine -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear cache
Write-Host "2. Clearing cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }
if (Test-Path ".cache") { Remove-Item -Recurse -Force ".cache" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }

Write-Host ""
Write-Host "3. ⚠️ IMPORTANT: Clear browser localStorage:" -ForegroundColor Red
Write-Host "   - Open DevTools (F12)" -ForegroundColor Yellow
Write-Host "   - Go to Application/Storage tab" -ForegroundColor Yellow
Write-Host "   - Clear all 'sb-*' and 'supabase*' keys" -ForegroundColor Yellow
Write-Host ""

# Restart
Write-Host "4. Starting dev server..." -ForegroundColor Green
npm start
