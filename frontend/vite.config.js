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
    // Phase 2.2: Aggressive optimization for fastest initial load
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      },
      output: {
        format: 'es',
        // Optimized chunking for maximum caching
        manualChunks(id) {
          // Core React - rarely changes
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-is') ||
              id.includes('node_modules/scheduler') ||
              id.includes('node_modules/prop-types')) {
            return 'react-core';
          }
          // Router - moderate change frequency
          if (id.includes('node_modules/react-router')) {
            return 'router';
          }
          // Heavy UI libraries - separate for better caching
          if (id.includes('node_modules/@mui') || 
              id.includes('node_modules/@emotion')) {
            return 'mui';
          }
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory')) {
            return 'charts';
          }
          // Phase 2.2: Split lucide-react icons for better tree-shaking
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          // Phase 2.2: Separate framer-motion (heavy animation library)
          if (id.includes('node_modules/framer-motion')) {
            return 'animation';
          }
          // Phase 2.2: Utilities - keep small and separate
          if (id.includes('node_modules/axios')) {
            return 'utils';
          }
          // Phase 2.2: Remove lodash from utils, use lodash-es instead
          if (id.includes('node_modules/lodash-es') ||
              id.includes('node_modules/jwt-decode') ||
              id.includes('node_modules/clsx')) {
            return 'utils';
          }
          // Vendor chunk for other dependencies
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      },
    },
    // Phase 2.2: Maximum optimization
    minify: 'esbuild',
    target: 'es2020', // Modern browsers only - smaller output
    cssCodeSplit: true,
    cssMinify: 'esbuild',
    sourcemap: false, // No sourcemaps in production
    assetsInlineLimit: 4096, // Inline small assets
    chunkSizeWarningLimit: 500,
    reportCompressedSize: false, // Faster builds
    // Phase 2.2: Production optimizations
    esbuildOptions: {
      drop: ['console', 'debugger'], // Remove console.* and debugger
      legalComments: 'none',
      treeShaking: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
      // Phase 2.2: Mark pure functions for better tree-shaking
      pure: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.error'],
      target: 'es2020',
      supported: {
        'top-level-await': true
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      defaultIsModuleExports: true,
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
    // Phase 2.2: Exclude heavy libraries from pre-bundling for better code-splitting
    exclude: [
      'recharts',
      'framer-motion',
      '@mui/material',
      '@mui/icons-material'
    ],
    esbuildOptions: {
      target: 'es2020',
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
