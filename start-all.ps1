Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Launching Resilix Distributed Saga System..." -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Auto-check and install dependencies if fresh clone
$services = @("inventory-service", "payment-service", "order-service", "client")
foreach ($svc in $services) {
    if (-not (Test-Path "$baseDir\$svc\node_modules")) {
        Write-Host "Installing dependencies for $svc (first-time setup)..." -ForegroundColor Yellow
        Push-Location "$baseDir\$svc"
        npm install
        Pop-Location
    }
}

# Auto-create client .env if missing
if (-not (Test-Path "$baseDir\client\.env")) {
    if (Test-Path "$baseDir\client\.env.example") {
        Copy-Item "$baseDir\client\.env.example" "$baseDir\client\.env"
        (Get-Content "$baseDir\client\.env") -replace 'VITE_USE_MOCK_API=true', 'VITE_USE_MOCK_API=false' | Set-Content "$baseDir\client\.env"
        Write-Host "Created client\.env configuration." -ForegroundColor Gray
    }
}

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
Start-Process powershell -ArgumentList "-NoExit", "npm", "run", "dev" -WorkingDirectory "$baseDir\client"

Write-Host ""
Write-Host "Waiting 5 seconds for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Running automated verification check..." -ForegroundColor Cyan
node "$baseDir\test-saga.js"

Write-Host ""
Write-Host "Open your browser at: http://localhost:5173" -ForegroundColor Green
