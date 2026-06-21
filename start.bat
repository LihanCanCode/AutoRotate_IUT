@echo off
title AntiWifi - Running
color 0A

echo ============================================
echo         AntiWifi - Starting Server
echo ============================================
echo.

:: Show this PC's IP address so the user can share it with roommates
echo Your IP address (share this with your roommates):
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    set IP=%%a
    call :trimspace
)
echo   http://%IP%:3000
echo.
echo ============================================
echo  Dashboard: http://localhost:3000
echo  For roommates on the same WiFi, use the
echo  IP address above.
echo ============================================
echo.
echo Starting server... (Press Ctrl+C to stop)
echo.

npm start

pause

:trimspace
set IP=%IP:~1%
goto :eof
