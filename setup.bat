@echo off
title AntiWifi Setup
color 0A

echo ============================================
echo        AntiWifi - First Time Setup
echo ============================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org
    echo Then run this setup again.
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo [2/3] Downloading browser for automation (~170MB, this may take a few minutes)...
call npx puppeteer browsers install chrome
if %errorlevel% neq 0 (
    echo [ERROR] Failed to download browser. Check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo [3/3] Setup complete!
echo.
echo ============================================
echo  NEXT STEP: Edit accounts.json with your
echo  router password and ISP account details.
echo ============================================
echo.
echo Opening accounts.json for editing...
timeout /t 2 >nul
notepad accounts.json

echo.
echo When you are done editing, run: start.bat
pause
