#!/usr/bin/env node
/**
 * Bundle Analysis Script - Phase 2.2
 * Analyzes package.json for unused or heavy dependencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('\n📊 Bundle Analysis - Phase 2.2\n');
console.log('='.repeat(60));

// Heavy dependencies to watch
const heavyDeps = [
  { name: '@mui/material', size: '~226 KB', recommendation: 'Use only needed components' },
  { name: 'recharts', size: '~226 KB', recommendation: 'Lazy load chart pages' },
  { name: 'framer-motion', size: '~50 KB', recommendation: 'Use CSS animations for simple cases' },
  { name: 'lodash', size: '~70 KB', recommendation: 'Replace with lodash-es for tree-shaking' },
  { name: '@mui/icons-material', size: '~40 KB', recommendation: 'Import individual icons' },
  { name: 'lucide-react', size: '~39 KB', recommendation: 'Already optimized with tree-shaking' }
];

console.log('\n🔍 Heavy Dependencies Found:\n');
heavyDeps.forEach(dep => {
  if (packageJson.dependencies[dep.name]) {
    console.log(`📦 ${dep.name}`);
    console.log(`   Size: ${dep.size}`);
    console.log(`   💡 ${dep.recommendation}`);
    console.log('');
  }
});

// Duplicate dependencies check
const duplicates = [
  { deps: ['react-toastify', 'react-hot-toast'], recommendation: 'Use only one toast library' },
  { deps: ['react-icons', 'lucide-react', '@mui/icons-material'], recommendation: 'Consolidate to lucide-react' }
];

console.log('\n⚠️  Potential Duplicates:\n');
duplicates.forEach(({ deps, recommendation }) => {
  const found = deps.filter(d => packageJson.dependencies[d]);
  if (found.length > 1) {
    console.log(`🔄 ${found.join(' + ')}`);
    console.log(`   💡 ${recommendation}`);
    console.log('');
  }
});

// Unused dependencies (common culprits)
const potentiallyUnused = [
  'express-validator', // Backend only
  'react-dnd', // If drag-drop not used
  'react-dnd-html5-backend',
  'react-error-boundary', // If not used extensively
];

console.log('\n❓ Potentially Unused Dependencies:\n');
potentiallyUnused.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`📦 ${dep} - Consider removing if not used`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n✅ Next Steps:\n');
console.log('1. Replace lodash → lodash-es');
console.log('2. Lazy load recharts charts');
console.log('3. Remove unused dependencies');
console.log('4. Consolidate icon libraries');
console.log('5. Run: npm run build to see impact\n');
