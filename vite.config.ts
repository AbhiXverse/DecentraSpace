import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  define: {
    'process.env': {},           // For compatibility with libraries using process.env
    global: 'globalThis',        // Fixes "global is not defined" in browser
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      util: 'util',
      assert: 'assert',
      events: 'events',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify/browser',
      url: 'url',
      querystring: 'querystring-es3',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    include: [
      'buffer',
      'process',
      'stream-browserify',
      'crypto-browserify',
      'util',
      'assert',
      'events',
      'http',
      'https-browserify',
      'os-browserify',
      'url',
      'querystring-es3',
      'ethers',                  // ✅ add ethers for pre-bundling
    ],
  },
  // Add proxy configuration to handle CORS
  server: {
    proxy: {
      '/huddle-api': {
        target: 'https://api.huddle01.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/huddle-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to Huddle01:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from Huddle01:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
});
