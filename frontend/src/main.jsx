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
