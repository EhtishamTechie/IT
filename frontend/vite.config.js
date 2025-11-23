import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react-is', 'prop-types'] // Prevent duplicate React instances
  },
  build: {
    // Aggressive optimization for fastest initial load
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      },
      output: {
        format: 'es',
        // Simplified chunking to prevent React conflicts
        manualChunks: {
          // Keep ALL React ecosystem together
          'react-vendor': [
            'react',
            'react/jsx-runtime',
            'react-dom',
            'react-dom/client',
            'scheduler',
            'react-is',
            'prop-types'
          ],
          // Router
          'router': ['react-router-dom'],
          // Query
          'query': ['@tanstack/react-query'],
          // Icons - separate for better caching
          'ui-icons': ['lucide-react'],
          // Utils (NO React)
          'utils': ['axios', 'lodash', 'jwt-decode', 'clsx']
        }
      },
    },
    // Maximum optimization
    minify: 'esbuild', // Use esbuild (faster, no extra dependency)
    target: 'es2020', // Modern browsers only - no legacy polyfills
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 4096, // Inline small assets
    chunkSizeWarningLimit: 500, // Strict limit
    reportCompressedSize: false, // Faster builds
    esbuildOptions: {
      drop: ['console', 'debugger'], // Remove console.logs and debuggers
      legalComments: 'none',
      treeShaking: true
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      defaultIsModuleExports: true, // Fix module export issues
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-is',
      'prop-types',
      'react-router-dom',
      'hoist-non-react-statics'
    ],
    exclude: [
      'recharts',
      'framer-motion'
    ],
    esbuildOptions: {
      target: 'es2015',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  cacheDir: 'node_modules/.vite',
})
