import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Load image protection CSS asynchronously (non-critical)
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/src/styles/imageProtection.css';
document.head.appendChild(link);

// Render app immediately
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// Phase 5: Register service worker for aggressive caching (sub-1-second repeat visits)
// Only in production to avoid interfering with development HMR and debugging
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}
