@echo off
cd /d "%~dp0"
echo.
echo Pocket Tanks - Browser Edition
echo Open http://127.0.0.1:5173 in your browser.
echo Keep this window open while you play. Press Ctrl+C to stop.
echo.
node server.cjs
if errorlevel 1 pause
