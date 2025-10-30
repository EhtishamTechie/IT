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
        manualChunks: {
          // Vendor chunks - these rarely change
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // Removed 'charts-vendor' - not used on homepage, will be lazy loaded only when needed
          'query-vendor': ['@tanstack/react-query'],
          'utils-vendor': ['axios', 'lodash', 'jwt-decode'],
          'ui-vendor': ['framer-motion', 'react-toastify', 'react-hot-toast'],
          'icons-vendor': ['lucide-react', 'react-icons', '@heroicons/react'],
          // Admin and Vendor pages in separate chunks
          'admin-pages': [
            './src/pages/Admin/AdminPage.jsx',
            './src/pages/Admin/ProductManagement.jsx',
            './src/pages/Admin/OrderManagement.jsx',
            './src/pages/Admin/UserManagement.jsx',
            './src/pages/Admin/CategoryManagement.jsx',
          ],
          'vendor-pages': [
            './src/pages/Vendor/VendorDashboardPage.jsx',
            './src/pages/Vendor/VendorProductsPage_clean.jsx',
            './src/pages/Vendor/VendorOrdersPage.jsx',
          ],
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
    include: ['react-is', 'react', 'react-dom', 'react-router-dom'],
    // Exclude heavy dependencies that should be loaded on demand
    exclude: ['recharts'], // Lazy load charts only when needed
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
