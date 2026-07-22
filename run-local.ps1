# Helper script to install and run the project locally on Windows PowerShell
# Run from the repo root.

$ErrorActionPreference = "Stop"

# 1) Install Python deps
Write-Host "Installing Python dependencies..."
python -m pip install --user -r ml-service\requirements.txt

# 2) Install server dependencies
Write-Host "Installing server npm dependencies..."
Push-Location server
if (Test-Path package-lock.json) { npm ci } else { npm install }
Pop-Location

# 3) Install client deps
Write-Host "Installing client npm dependencies..."
Push-Location client
if (Test-Path package-lock.json) { npm ci } else { npm install }
Pop-Location

# 4) Start Python ML service in background
Write-Host "Starting Python ML service..."
Start-Process -NoNewWindow -FilePath python -ArgumentList "ml-service\app.py"

# 5) Start server
Write-Host "Starting Node server (server)..."
Start-Process -NoNewWindow -FilePath npm -ArgumentList "run", "start" -WorkingDirectory server

# 6) Start client dev server
Write-Host "Starting client dev server..."
Start-Process -NoNewWindow -FilePath npm -ArgumentList "run", "dev" -WorkingDirectory client

Write-Host "Started services. Open http://localhost:5173 to use the app."
