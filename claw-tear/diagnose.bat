@echo off
setlocal EnableDelayedExpansion
title Claw Tear - Windows 11 Diagnostic Tool

cd /d "%~dp0"
cls
echo.
echo   ============================================================
echo          Claw Tear - Windows 11 Pro Diagnostic Check
echo   ============================================================
echo.

echo   [1/5] Checking Current Folder...
echo         Path: "%~dp0"
echo "%~dp0" | findstr /i "AppData\\Local\\Temp Temp1_" >nul 2>&1
if not errorlevel 1 (
  echo         STATUS: [FAIL] Running from temporary ZIP preview!
  echo         ACTION: Right-click the downloaded ZIP and click "Extract All" first.
) else (
  echo         STATUS: [PASS] Running from an extracted folder.
)
echo.

echo   [2/5] Checking Node.js Installation...
node -v >nul 2>&1
if not errorlevel 1 (
  for /f "delims=" %%v in ('node -v 2^>nul') do set "NVER=%%v"
  echo         STATUS: [PASS] Node.js !NVER! is installed and available in PATH.
) else (
  echo         STATUS: [FAIL] Node.js is not recognized in command line.
  if exist "%ProgramFiles%\nodejs\node.exe" (
    echo         NOTE:   Found node.exe in "%ProgramFiles%\nodejs\node.exe", but not yet in PATH.
  ) else (
    echo         ACTION: Download and install Node.js LTS from https://nodejs.org
  )
)
echo.

echo   [3/5] Checking Required Files in this Folder...
if exist "server.js" (
  echo         server.js:    [PASS] Found
) else (
  echo         server.js:    [FAIL] Missing! (Make sure to extract all files from ZIP)
)
if exist "public\index.html" (
  echo         public files: [PASS] Found
) else (
  echo         public files: [FAIL] Missing!
)
echo.

echo   [4/5] Checking Port 3000 Status...
set "P3000=0"
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr ":3000 " 2^>nul') do (
  if not "%%p"=="" if not "%%p"=="0" set "P3000=%%p"
)
if "!P3000!"=="0" (
  echo         Port 3000:    [PASS] Port 3000 is completely free and ready!
) else (
  echo         Port 3000:    [OCCUPIED] Process PID !P3000! is currently using port 3000.
  echo         ACTION:       Run "Kill Previous Project.bat" to free it.
)
echo.

echo   [5/5] Checking Ollama Engine...
where curl >nul 2>&1
if not errorlevel 1 (
  curl -s -m 1 http://127.0.0.1:11434/api/version >nul 2>&1
  if not errorlevel 1 (
    echo         Ollama:       [PASS] Ollama is active on port 11434!
  ) else (
    echo         Ollama:       [IDLE] Ollama is not currently responding on port 11434.
    echo                       (The script will automatically attempt to launch it for you).
  )
) else (
  echo         Ollama check: curl not found, skipping check.
)
echo.

echo   ============================================================
echo   Diagnostic Complete!
echo   ============================================================
echo.
pause
endlocal
