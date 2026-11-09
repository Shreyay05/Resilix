Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Launching Resilix Distributed Saga System..." -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# 1. Start Inventory Service (Port 5002)
Write-Host "Starting Inventory Service (Port 5002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\inventory-service'; node index.js"

# 2. Start Payment Service (Port 5003)
Write-Host "Starting Payment Service (Port 5003)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\payment-service'; node index.js"

# 3. Start Order Service (Port 5001)
Write-Host "Starting Order Service (Port 5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\order-service'; node index.js"

# 4. Start Client UI (Port 5173)
Write-Host "Starting React Frontend (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\client'; npm run dev"

Write-Host ""
Write-Host "Waiting 4 seconds for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 4

Write-Host ""
Write-Host "Running automated verification check..." -ForegroundColor Cyan
node "$baseDir\test-saga.js"

Write-Host ""
Write-Host "Open your browser at: http://localhost:5173" -ForegroundColor Green
