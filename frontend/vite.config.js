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
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Simplified chunking strategy to avoid circular dependency issues
          if (id.includes('node_modules')) {
            // Group all React-related libraries together
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || 
                id.includes('react-is') || id.includes('@tanstack/react-query')) {
              return 'vendor';
            }
            // Group MUI with emotion to avoid initialization errors
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'vendor';
            }
            // Keep other libraries in vendor too for simplicity
            if (id.includes('axios') || id.includes('lodash') || id.includes('jwt-decode') ||
                id.includes('framer-motion') || id.includes('react-toastify') || id.includes('react-hot-toast') ||
                id.includes('lucide-react') || id.includes('react-icons') || id.includes('@heroicons')) {
              return 'vendor';
            }
          }
          
          // Admin pages - only load when accessed
          if (id.includes('/pages/Admin/')) {
            return 'admin-pages';
          }
          
          // Vendor pages - only load when accessed
          if (id.includes('/pages/Vendor/')) {
            return 'vendor-pages';
          }
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minify for production - esbuild is faster than terser for Vite
    minify: 'esbuild',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Enable source maps for debugging (can disable in production)
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-is', '@tanstack/react-query'],
    // Don't exclude recharts - let it be optimized normally
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
    // Enable HTTP/2 for faster loading
    https: false,
  },
  // Enable better caching
  cacheDir: 'node_modules/.vite',
})
