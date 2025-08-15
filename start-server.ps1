Write-Host "Starting EquiTrack Server..." -ForegroundColor Green

# Check if port 3000 is in use
$portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Port 3000 is already in use. Attempting to free it..." -ForegroundColor Yellow
    $processes = Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force
            Write-Host "Killed process $processId" -ForegroundColor Yellow
        }
        catch {
            Write-Host "Could not kill process $processId" -ForegroundColor Red
        }
    }
    Start-Sleep -Seconds 2
}

# Start the server
Write-Host "Starting server on port 3000..." -ForegroundColor Green
npm start

Read-Host "Press Enter to exit"
