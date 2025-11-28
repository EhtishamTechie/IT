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
          if (id.includes('node_modules/recharts')) {
            return 'charts';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'animation';
          }
          // Utilities - small, rarely change
          if (id.includes('node_modules/axios') ||
              id.includes('node_modules/lodash') ||
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
    // Maximum optimization
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    cssMinify: 'esbuild', // More aggressive CSS minification
    sourcemap: false,
    assetsInlineLimit: 4096, // Increased to 4KB - reduce HTTP requests
    chunkSizeWarningLimit: 400,
    reportCompressedSize: false,
    // Production optimizations
    esbuildOptions: {
      drop: ['console', 'debugger'],
      legalComments: 'none',
      treeShaking: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true,
      pure: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      target: 'es2020'
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
