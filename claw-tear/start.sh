#!/usr/bin/env bash
set -e

echo "===================================================================="
echo "                     CLAW TEAR AI CHAT LAUNCHER                     "
echo "             Private Local AI Powered by Ollama                     "
echo "===================================================================="
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not found on your system PATH!"
    echo "Please install Node.js (v18.17+ LTS) from https://nodejs.org/"
    exit 1
fi
echo "[OK] Node.js detected: $(node -v)"
echo ""

# 2. Check Ollama & list models
if command -v ollama &> /dev/null; then
    echo "[OK] Ollama CLI detected."
    echo "--------------------------------------------------------------------"
    echo "  DOWNLOADED OLLAMA MODELS ON YOUR DEVICE:"
    echo "--------------------------------------------------------------------"
    ollama list
    echo "--------------------------------------------------------------------"
else
    echo "[NOTE] Ollama CLI not in PATH. Ensure Ollama is running at http://127.0.0.1:11434"
fi
echo ""

# 3. Open browser and run zero-dependency server
echo "[*] Launching Claw Tear at http://localhost:3000..."
node server.js --port=3000 --open
