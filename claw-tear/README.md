# Claw Tear - Local Ollama AI

A fast, private, distraction-free AI assistant interface with thinking/deep reasoning support, powered 100% locally by Ollama on your computer.

Claw Tear needs **no npm install**, **no build step**, and runs with **zero third-party dependencies** using Node.js built-ins.

---

## 🚀 Step-by-Step: How to Run Perfectly (Windows)

### Step 1: Kill Any Old Sessions (Recommended)
If you previously ran an earlier version of the project, double-click:
👉 **`Kill Previous Project.bat`**
* This frees up port 3000 so the fresh app can load without conflicts.

### Step 2: Start Claw Tear & Ollama
Double-click:
👉 **`Start Local AI.bat`**
* The script will:
  1. Detect your Node.js installation.
  2. **Automatically start Ollama** in the background if it's not already running.
  3. Ensure port 3000 is clean.
  4. **Automatically open your default browser** (Chrome, Edge, Brave, Firefox) to `http://localhost:3000`.

### Step 3: Keep the Black Window Open
* Keep the Command Prompt window open while you use Claw Tear.
* When you are finished, simply close the window or press `Ctrl + C`.

---

## 🛡️ Windows SmartScreen ("Windows Protected Your PC")
When downloading any zip file from the internet, Windows Defender SmartScreen may display:
> *"Windows protected your PC - Microsoft Defender SmartScreen prevented an unrecognized app from starting."*

This happens because the `.bat` file was downloaded from a browser and isn't digitally signed with a paid certificate.
* **To proceed**: Click **"More info"** and then click **"Run anyway"**.
* The batch file contains only safe, standard Windows commands to start Node and Ollama.

---

## 🍎 macOS / Linux

In a terminal inside the project folder:
```bash
chmod +x start.sh
./start.sh
```
Or directly:
```bash
node server.js --open
```

---

## 🦙 Downloading Ollama Models

Open a Command Prompt or Terminal and run any of these commands to download models:

```bash
# Recommended lightweight & fast models:
ollama run qwen2.5:1.5b
ollama run llama3.2:3b

# Deep reasoning models (displays step-by-step thinking blocks):
ollama run deepseek-r1:1.5b
ollama run deepseek-r1:7b

# General models:
ollama run mistral:latest
ollama run qwen2.5:7b
```

Once downloaded, they will **immediately appear** in the model dropdown in the top bar!

---

## ⚙️ Command Line Options

You can customize the port or Ollama address when starting `server.js`:

```bash
# Custom port
node server.js --port=3210 --open

# Custom Ollama remote/network endpoint
node server.js --ollama=http://192.168.1.50:11434 --open
```
