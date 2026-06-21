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
echo  OPTIONAL: AUTO-RUN ON WINDOWS STARTUP
echo ============================================
set /p autorun="Do you want AntiWifi to run automatically in the background when your PC starts? (Y/N): "
if /i "%autorun%"=="Y" (
    echo Creating Windows Startup shortcut...
    powershell -Command "$wsh = New-Object -ComObject WScript.Shell; $shortcut = $wsh.CreateShortcut(\"$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\AntiWifi.lnk\"); $shortcut.TargetPath = \"%~dp0start-silent.vbs\"; $shortcut.WorkingDirectory = \"%~dp0\"; $shortcut.Save()"
    echo [SUCCESS] AntiWifi will now run in the background on startup.
) else (
    echo [INFO] Skipped startup shortcut registration.
)
echo.
echo ============================================
echo  NEXT STEP: Run start.bat (visible console)
echo  or double-click start-silent.vbs (silent)
echo  to start the server. Then open:
echo  http://localhost:3000
echo ============================================
echo.
pause


