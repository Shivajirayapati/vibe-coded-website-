#!/usr/bin/env node
/**
 * Claw Tear - Local Web Server + Ollama Proxy
 *
 * - Serves the modern Claw Tear web UI from ./dist or ./public
 * - Proxies requests to local Ollama at 127.0.0.1:11434 so the browser never suffers
 *   from CORS errors, mixed-content blocks, or direct exposure
 * - Zero npm dependencies: uses Node's built-in http, fs, path, url, child_process only.
 * - Starts instantly with "node server.js" or by double-clicking "Start Local AI.bat"
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, exec } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ------------------------------------------------------------------ */
/* CLI & Configuration                                                */
/* ------------------------------------------------------------------ */

function parseArgs() {
  const args = process.argv.slice(2);
  const conf = {
    port: 3000,
    host: '127.0.0.1',
    ollamaUrl: 'http://127.0.0.1:11434',
    open: false,
    appName: 'Claw Tear',
    appVersion: '1.0.0'
  };

  for (const arg of args) {
    if (arg.startsWith('--port=')) {
      const p = parseInt(arg.slice(7), 10);
      if (!isNaN(p) && p > 0 && p < 65536) conf.port = p;
    } else if (arg.startsWith('--host=')) {
      conf.host = arg.slice(7).trim();
    } else if (arg.startsWith('--ollama=')) {
      conf.ollamaUrl = arg.slice(9).trim().replace(/\/+$/, '');
    } else if (arg === '--open') {
      conf.open = true;
    }
  }

  // Allow PORT environment variable if provided
  if (process.env.PORT) {
    const envPort = parseInt(process.env.PORT, 10);
    if (!isNaN(envPort) && envPort > 0) conf.port = envPort;
  }

  return conf;
}

const config = parseArgs();

// Determine static root: prefer ./dist if built, otherwise ./public
let STATIC_DIR = path.join(__dirname, 'dist');
if (!fs.existsSync(path.join(STATIC_DIR, 'index.html'))) {
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(path.join(publicDir, 'index.html'))) {
    STATIC_DIR = publicDir;
  }
}

/* ------------------------------------------------------------------ */
/* MIME Types & Static File Serving                                   */
/* ------------------------------------------------------------------ */

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJSON(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(payload);
}

function serveStaticFile(req, res, pathname) {
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(STATIC_DIR, safePath);

  // If path is a directory, look for index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA fallback: if file does not exist, serve index.html
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(STATIC_DIR, 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const stat = fs.statSync(filePath);

  const headers = {
    'Content-Type': mime,
    'Content-Length': stat.size,
    'X-Content-Type-Options': 'nosniff'
  };

  if (ext === '.html') {
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
  } else {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  }

  res.writeHead(200, headers);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  return true;
}

async function readJSONBody(req, maxBytes = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error('Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Request body was not valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

/* ------------------------------------------------------------------ */
/* Ollama Handlers                                                    */
/* ------------------------------------------------------------------ */

async function handleHealth(req, res) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const vRes = await fetch(`${config.ollamaUrl}/api/version`, { signal: controller.signal });
    clearTimeout(timer);

    if (vRes.ok) {
      const vData = await vRes.json();
      sendJSON(res, 200, {
        ok: true,
        connected: true,
        ollamaVersion: vData.version || 'unknown',
        ollamaUrl: config.ollamaUrl,
        appName: config.appName,
        appVersion: config.appVersion
      });
      return;
    }
  } catch {
    /* unreachable */
  }

  sendJSON(res, 200, {
    ok: true,
    connected: false,
    ollamaUrl: config.ollamaUrl,
    appName: config.appName,
    appVersion: config.appVersion,
    error: 'Ollama is not answering on ' + config.ollamaUrl
  });
}

async function handleModels(req, res) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const tagsRes = await fetch(`${config.ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);

    if (!tagsRes.ok) {
      sendJSON(res, tagsRes.status, { error: `Ollama returned HTTP ${tagsRes.status}`, models: [] });
      return;
    }

    const data = await tagsRes.json();
    const rawModels = data.models || [];
    const models = rawModels
      .filter((m) => {
        const name = (m.name || m.model || '').toLowerCase();
        return !name.endsWith(':cloud') && !name.endsWith('-cloud');
      })
      .map((m) => ({
        name: m.name || m.model || '',
        size: m.size || 0,
        modified_at: m.modified_at || '',
        details: m.details || {}
      }));

    sendJSON(res, 200, {
      models,
      ollamaUrl: config.ollamaUrl,
      fetchedAt: new Date().toISOString()
    });
  } catch (err) {
    sendJSON(res, 502, {
      error: 'Cannot connect to Ollama at ' + config.ollamaUrl + '. Is Ollama running?',
      models: [],
      detail: String(err?.message || err)
    });
  }
}

async function handleChat(req, res) {
  let body;
  try {
    body = await readJSONBody(req);
  } catch (err) {
    sendJSON(res, 400, { error: String(err?.message || err) });
    return;
  }

  const model = (body.model || '').trim();
  if (!model) {
    sendJSON(res, 400, { error: 'No model specified' });
    return;
  }

  const inMessages = Array.isArray(body.messages) ? body.messages : [];
  if (!inMessages.length) {
    sendJSON(res, 400, { error: 'No messages provided' });
    return;
  }

  const upstream = new AbortController();
  let clientGone = false;

  const onClose = () => {
    clientGone = true;
    upstream.abort();
  };
  req.on('close', onClose);
  res.on('close', onClose);

  try {
    const upstreamRes = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: inMessages,
        stream: true,
        options: body.options || {},
        keep_alive: '5m'
      }),
      signal: upstream.signal
    });

    if (!upstreamRes.ok) {
      req.off('close', onClose);
      res.off('close', onClose);
      const text = await upstreamRes.text().catch(() => '');
      sendJSON(res, upstreamRes.status, { error: text || `Ollama returned HTTP ${upstreamRes.status}` });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*'
    });

    if (upstreamRes.body) {
      // Stream Node stream to client
      const reader = upstreamRes.body.getReader();
      while (true) {
        if (clientGone) break;
        const { done, value } = await reader.read();
        if (done) break;
        if (value && !res.writableEnded) {
          res.write(value);
        }
      }
    }
  } catch (err) {
    if (!clientGone && err?.name !== 'AbortError') {
      if (!res.headersSent) {
        sendJSON(res, 502, { error: 'Connection to Ollama failed', detail: String(err?.message || err) });
      } else if (!res.writableEnded) {
        res.write(JSON.stringify({ error: String(err?.message || err), done: true }) + '\n');
      }
    }
  } finally {
    req.off('close', onClose);
    res.off('close', onClose);
    upstream.abort();
    if (!res.writableEnded) res.end();
  }
}

/* ------------------------------------------------------------------ */
/* HTTP Server & Routing                                              */
/* ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // API Routes
    if (pathname === '/api/health' && req.method === 'GET') {
      return await handleHealth(req, res);
    }
    if ((pathname === '/api/models' || pathname === '/api/tags') && req.method === 'GET') {
      return await handleModels(req, res);
    }
    if (pathname === '/api/version' && req.method === 'GET') {
      return await handleHealth(req, res);
    }
    if (pathname === '/api/chat' && req.method === 'POST') {
      return await handleChat(req, res);
    }

    // Static Files (UI)
    if (req.method === 'GET' || req.method === 'HEAD') {
      const served = serveStaticFile(req, res, pathname);
      if (served) return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  } catch (err) {
    if (!res.headersSent) {
      sendJSON(res, 500, { error: 'Internal server error', detail: String(err?.message || err) });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;
server.requestTimeout = 0;

/* ------------------------------------------------------------------ */
/* Browser Opener & Ollama Auto-Start                                  */
/* ------------------------------------------------------------------ */

// Global safety net to prevent any background child process error from crashing the server
process.on('uncaughtException', (err) => {
  console.warn('   [Background Notice]', err.message);
});

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      exec(`cmd /c start "" "${url}"`, (err) => {
        if (err) {
          exec(`explorer "${url}"`, (err2) => {
            if (err2) {
              exec(`powershell -NoProfile -Command "Start-Process '${url}'"`);
            }
          });
        }
      });
    } else if (process.platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  } catch (err) {
    console.warn('   Could not auto-open browser:', err.message);
  }
}

async function tryEnsureOllamaRunning(ollamaUrl) {
  // If remote Ollama specified, don't try local startup
  if (!ollamaUrl.includes('127.0.0.1') && !ollamaUrl.includes('localhost')) {
    return false;
  }

  // 1. Check if Ollama is already responding
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${ollamaUrl}/api/version`, { signal: controller.signal });
    clearTimeout(t);
    if (res.ok) {
      const v = await res.json();
      console.log(`   [OK] Ollama ${v.version || ''} is active on port 11434.`);
      return true;
    }
  } catch {}

  // 2. Ollama is not answering; try to start it automatically
  console.log('   [i] Ollama is not running. Launching Ollama in the background...');
  let launched = false;

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const appExe1 = path.join(localAppData, 'Programs', 'Ollama', 'ollama app.exe');
    const appExe2 = path.join(programFiles, 'Ollama', 'ollama app.exe');

    if (fs.existsSync(appExe1)) {
      try {
        const child = spawn(appExe1, [], { detached: true, stdio: 'ignore' });
        child.on('error', () => {});
        child.unref();
        launched = true;
      } catch {}
    } else if (fs.existsSync(appExe2)) {
      try {
        const child = spawn(appExe2, [], { detached: true, stdio: 'ignore' });
        child.on('error', () => {});
        child.unref();
        launched = true;
      } catch {}
    } else {
      try {
        const child = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore', shell: true });
        child.on('error', () => {});
        child.unref();
        launched = true;
      } catch {}
    }
  } else if (process.platform === 'darwin') {
    try {
      const child = spawn('open', ['-a', 'Ollama'], { detached: true, stdio: 'ignore' });
      child.on('error', () => {});
      child.unref();
      launched = true;
    } catch {}
  } else {
    try {
      const child = spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' });
      child.on('error', () => {});
      child.unref();
      launched = true;
    } catch {}
  }

  if (launched) {
    // Wait up to 5 seconds for Ollama to become responsive
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1000);
        const res = await fetch(`${ollamaUrl}/api/version`, { signal: controller.signal });
        clearTimeout(t);
        if (res.ok) {
          const v = await res.json();
          console.log(`   [OK] Ollama ${v.version || ''} started successfully!`);
          return true;
        }
      } catch {}
    }
    console.log('   [i] Ollama background launch requested. You can start chatting once models are ready.');
    return true;
  } else {
    console.log('   [i] Note: Ollama was not found in standard paths.');
    console.log('       If Ollama is not installed yet, download it from https://ollama.com');
    return false;
  }
}

let currentPort = config.port;
let portAttempts = 0;
const MAX_PORT_ATTEMPTS = 5;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    portAttempts++;
    if (portAttempts < MAX_PORT_ATTEMPTS) {
      const nextPort = currentPort + 1;
      console.warn(`\n  [!] Port ${currentPort} is already in use.`);
      console.warn(`      Automatically trying next available port: ${nextPort}...\n`);
      currentPort = nextPort;
      config.port = nextPort;
      setTimeout(() => {
        server.listen(currentPort, config.host);
      }, 200);
      return;
    }

    console.error('');
    console.error(`  [X] Ports ${config.port - MAX_PORT_ATTEMPTS + 1} to ${config.port} are all in use.`);
    console.error('');
    console.error('      Either Claw Tear is already running (check your browser tabs and');
    console.error(`      open http://localhost:${config.port}), or another program took the port.`);
    console.error('');
    console.error('      To specify a specific port:');
    console.error(`          node server.js --port=3005 --open`);
    console.error('');
    process.exit(1);
  }
  console.error('  [X] Server error:', err.message);
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  const url = `http://${config.host === '127.0.0.1' ? 'localhost' : config.host}:${currentPort}`;
  console.log('');
  console.log('  ============================================================');
  console.log(`               ${config.appName} v${config.appVersion} - RUNNING!`);
  console.log('  ============================================================');
  console.log('');
  console.log(`   * Local App URL:       ${url}`);
  console.log(`   * Ollama Engine:       ${config.ollamaUrl}`);
  console.log(`   * Serving Web UI:      ${STATIC_DIR}`);
  console.log('');
  console.log('   Opening your web browser now...');

  // 1. Immediately open browser so user does not wait
  if (config.open) {
    openBrowser(url);
  }

  // 2. In background, check/start Ollama without blocking or crashing
  tryEnsureOllamaRunning(config.ollamaUrl).catch((err) => {
    console.log('   [i] Ollama check note:', err.message);
  });

  console.log('');
  console.log('   ------------------------------------------------------------');
  console.log('   KEEP THIS WINDOW OPEN while using Claw Tear.');
  console.log('   To stop Claw Tear, press Ctrl+C or close this window.');
  console.log('   ------------------------------------------------------------');
  console.log('');
});

const shutdown = () => {
  console.log('\n  Stopping server...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
