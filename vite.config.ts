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
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Essential aliases for ethers and crypto
      buffer: 'buffer',
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      util: 'util',
      assert: 'assert',
      events: 'events',
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
      'ethers',
      // ✅ Add Huddle01 packages if needed
      '@huddle01/react',
    ],
  },
  // ✅ Enhanced server configuration
  server: {
    port: 5173,
    host: true, // Allow external connections
    cors: true, // Enable CORS
    proxy: {
      // ✅ LOCAL BACKEND PROXY - This is what you need for your backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxy if needed
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🚨 Backend proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('📤 Sending to backend:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('📥 Response from backend:', proxyRes.statusCode, req.url);
          });
        },
      },
      
      // ✅ Huddle01 API proxy (for direct API calls if needed)
      '/huddle-api': {
        target: 'https://api.huddle01.com/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/huddle-api/, ''),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🚨 Huddle01 proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('📤 Sending to Huddle01:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('📥 Response from Huddle01:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  // ✅ Build optimizations
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ethers: ['ethers'],
          huddle: ['@huddle01/react'],
        },
      },
    },
    // Suppress sourcemap warnings
    sourcemap: true,
  },
  // ✅ Environment variables configuration
  envPrefix: 'VITE_',
});
