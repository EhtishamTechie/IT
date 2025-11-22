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
  },
  build: {
    // Aggressive optimization for fastest initial load
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Ultra-aggressive splitting for maximum performance
          if (id.includes('node_modules')) {
            // Absolute essentials only - smallest possible initial bundle
            if (id.includes('react/jsx-runtime') || id.includes('scheduler')) {
              return 'react-runtime'; // Ultra critical, tiny chunk
            }
            
            // React core - load immediately but separate
            if (id.includes('react-dom/client') || id.includes('react-dom')) {
              return 'react-dom';
            }
            
            if (id.includes('react/') && !id.includes('react-dom') && !id.includes('react-router')) {
              return 'react';
            }
            
            // Router - needed for navigation
            if (id.includes('react-router')) {
              return 'router';
            }
            
            // Query - can load slightly after
            if (id.includes('@tanstack/react-query')) {
              return 'query';
            }
            
            // Heavy UI libraries - lazy load aggressively
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'mui';
            }
            
            // Icons - very lazy
            if (id.includes('react-icons') || id.includes('@heroicons') || id.includes('lucide-react')) {
              return 'icons';
            }
            
            // Animations - lazy
            if (id.includes('framer-motion')) {
              return 'motion';
            }
            
            // Charts - only for analytics
            if (id.includes('recharts')) {
              return 'charts';
            }
            
            // Utilities
            if (id.includes('axios')) {
              return 'http';
            }
            
            if (id.includes('lodash')) {
              return 'lodash';
            }
            
            // Everything else
            return 'vendor';
          }
          
          // Admin pages - never load for customers
          if (id.includes('/pages/Admin/')) {
            return 'admin';
          }
          
          // Vendor pages - never load for customers
          if (id.includes('/pages/Vendor/')) {
            return 'vendor-pages';
          }
          
          // Heavy components
          if (id.includes('/components/Admin/')) {
            return 'admin-comp';
          }
          
          if (id.includes('/components/Vendor/')) {
            return 'vendor-comp';
          }
        },
      },
    },
    // Maximum optimization
    minify: 'esbuild',
    target: 'es2015',
    cssCodeSplit: true,
    sourcemap: false,
    assetsInlineLimit: 4096, // Inline small assets
    chunkSizeWarningLimit: 500, // Strict limit
    reportCompressedSize: false, // Faster builds
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    // Pre-bundle only absolute essentials
    include: [
      'react/jsx-runtime',
      'react',
      'react-dom/client',
      'react-router-dom',
      'hoist-non-react-statics'
    ],
    exclude: [
      'recharts',
      'framer-motion'
    ],
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
