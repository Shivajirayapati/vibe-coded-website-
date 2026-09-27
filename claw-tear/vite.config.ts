import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/ollama': {
          target: 'http://127.0.0.1:11434',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/ollama/, ''),
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !(res as any).headersSent) {
                (res as any).writeHead(503, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ models: [], error: 'Ollama not reachable on 127.0.0.1:11434' }));
              }
            });
          },
        },
        '/api/tags': {
          target: 'http://127.0.0.1:11434',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !(res as any).headersSent) {
                (res as any).writeHead(503, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ models: [], error: 'Ollama not reachable' }));
              }
            });
          },
        },
        '/api/chat': {
          target: 'http://127.0.0.1:11434',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !(res as any).headersSent) {
                (res as any).writeHead(503, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ error: 'Ollama not reachable', done: true }));
              }
            });
          },
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
