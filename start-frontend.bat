@echo off
title NajmUni - Frontend
cd /d "%~dp0client"
echo Starting React app...
start "" "http://localhost:5173"
npm run dev
pause
