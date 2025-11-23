import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Critical CSS for above-the-fold content
// This includes only the styles needed for initial render
const criticalCSS = `
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.5;
}

#root {
  min-height: 100vh;
}

/* Prevent layout shift */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Loading states */
.loading-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Critical navigation styles */
header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  max-width: 1280px;
  margin: 0 auto;
}

/* Critical hero section */
.hero-section {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem;
}

/* Critical card grid */
.card-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

/* Hide flash of unstyled content */
.hydrating {
  opacity: 0;
}

.hydrated {
  opacity: 1;
  transition: opacity 0.3s ease-in;
}
`;

async function injectCriticalCSS() {
  try {
    const indexPath = resolve(__dirname, '../dist/index.html');
    let html = readFileSync(indexPath, 'utf-8');

    // Inject critical CSS inline in <head>
    const criticalStyleTag = `
    <style id="critical-css">
      ${criticalCSS.trim()}
    </style>`;

    // Insert before closing </head>
    html = html.replace('</head>', `${criticalStyleTag}\n  </head>`);

    // Make main CSS non-render-blocking by loading it asynchronously
    html = html.replace(
      /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
      (match, cssPath) => `
    <link rel="preload" href="${cssPath}" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="${cssPath}"></noscript>
    <script>
      // Fallback for older browsers
      if (!('onload' in document.createElement('link'))) {
        var link = document.querySelector('link[href="${cssPath}"]');
        if (link) link.rel = 'stylesheet';
      }
    </script>`
    );

    writeFileSync(indexPath, html);
    console.log('✅ Critical CSS injected successfully');
    console.log('✅ Main CSS made non-render-blocking');
  } catch (error) {
    console.error('❌ Error injecting critical CSS:', error);
    process.exit(1);
  }
}

injectCriticalCSS();
