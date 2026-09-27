@echo off
setlocal EnableDelayedExpansion
title Claw Tear - Kill Previous Project

cd /d "%~dp0"
cls
echo.
echo   ============================================================
echo              Claw Tear - Terminate Previous Project
echo   ============================================================
echo.
echo   Scanning for leftover processes holding port 3000 and 3001...
echo.

set "FOUND=0"

REM Check and kill process on port 3000
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr ":3000 " 2^>nul') do (
  if not "%%p"=="" if not "%%p"=="0" (
    echo   [!] Found running process PID %%p on Port 3000.
    echo       Terminating PID %%p...
    taskkill /F /PID %%p >nul 2>&1
    set "FOUND=1"
  )
)

REM Check and kill process on port 3001
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr ":3001 " 2^>nul') do (
  if not "%%p"=="" if not "%%p"=="0" (
    echo   [!] Found running process PID %%p on Port 3001.
    echo       Terminating PID %%p...
    taskkill /F /PID %%p >nul 2>&1
    set "FOUND=1"
  )
)

echo.
if "!FOUND!"=="0" (
  echo   [OK] No lingering servers found. Ports 3000 and 3001 are already free!
) else (
  echo   [OK] All leftover processes have been terminated!
  echo        Ports 3000 and 3001 are now completely clear.
)

echo.
echo   ------------------------------------------------------------
echo   You can now double-click "Start Local AI.bat" to start fresh!
echo   ------------------------------------------------------------
echo.
pause
endlocal
