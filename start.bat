@echo off
cd /d "%~dp0"
if not exist node_modules\vite\bin\vite.js (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 exit /b 1
)
echo Starting game...
start "" "http://127.0.0.1:5173/"
node node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173 --strictPort
