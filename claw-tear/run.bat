@echo off
title Claw Tear
cd /d "%~dp0"
echo Starting Claw Tear on Windows 11...
start http://localhost:3000
start msedge http://localhost:3000
node server.js --port=3000 --open
pause
