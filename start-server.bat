@echo off
echo Starting EquiTrack Server...

REM Check if port 3000 is in use
netstat -ano | findstr :3000 > nul
if %errorlevel% equ 0 (
    echo Port 3000 is already in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo Killing process %%a
        taskkill /PID %%a /F > nul 2>&1
    )
    timeout /t 2 /nobreak > nul
)

REM Start the server
echo Starting server on port 3000...
npm start

pause
