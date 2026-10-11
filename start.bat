@echo off
cd /d "%~dp0"
if not exist node_modules\vite (
    echo Installing dependencies...
    call npm install
)
echo Starting game...
start "" http://localhost:5173
npm run dev
