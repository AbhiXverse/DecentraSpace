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
      '@huddle01/react',
    ],
  },
  // ✅ Enhanced server configuration for LOCAL development
  server: {
    port: 5173,
    host: true,
    cors: true,
    proxy: {
      // 🔧 UPDATED: Backend proxy for development
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
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
    },
  },
  // ✅ UPDATED: Production build optimizations for Vercel
  build: {
    target: 'esnext',
    outDir: 'dist', // Vercel looks for this
    sourcemap: false, // Disable for production to reduce bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // Optimize chunks for better loading
          vendor: ['react', 'react-dom', 'react-router-dom'],
          web3: ['ethers'], 
          huddle: ['@huddle01/react'],
          ui: ['lucide-react'], // UI icons
        },
      },
    },
    // ✅ Optimize for Vercel deployment
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
  // ✅ Environment variables configuration
  envPrefix: 'VITE_',
  
  // ✅ NEW: Preview configuration for testing builds locally
  preview: {
    port: 4173,
    host: true,
  },
});
