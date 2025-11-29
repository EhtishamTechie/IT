/**
 * Icon Library Analysis Script
 * Identifies all icon imports and suggests lucide-react replacements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');

// Icon library patterns
const patterns = {
  mui: /@mui\/icons-material/g,
  reactIcons: /react-icons\/\w+/g,
  heroIcons: /@heroicons\/react/g,
  lucide: /lucide-react/g
};

// Icon mapping from MUI/react-icons to lucide-react
const iconMapping = {
  // MUI to Lucide
  'Preview': 'Eye',
  'PreviewIcon': 'Eye',
  'ArrowBack': 'ArrowLeft',
  'ArrowBackIcon': 'ArrowLeft',
  'Search': 'Search',
  'SearchIcon': 'Search',
  'Close': 'X',
  'CloseIcon': 'X',
  'Delete': 'Trash2',
  'DeleteIcon': 'Trash2',
  'Clear': 'X',
  'ClearIcon': 'X',
  
  // react-icons to Lucide
  'FiX': 'X',
  'FiPackage': 'Package',
  'FiEdit': 'Edit',
  'FiPlus': 'Plus',
  'FiMinus': 'Minus',
  'FiSave': 'Save',
  'FiAlert': 'AlertCircle',
  'FiTruck': 'Truck',
  'FiDollarSign': 'DollarSign',
  'FiShoppingCart': 'ShoppingCart',
  'FiSearch': 'Search',
  'FiFilter': 'Filter',
  'FiRefreshCw': 'RefreshCw',
  'FiEye': 'Eye',
  'FiTrash2': 'Trash2',
  'FiCheck': 'Check',
  'FaArrowLeft': 'ArrowLeft',
  'FaClock': 'Clock',
  'FaRocket': 'Rocket'
};

// Results
const results = {
  mui: new Map(),
  reactIcons: new Map(),
  heroIcons: new Map(),
  lucide: new Map(),
  totalFiles: 0
};

// Scan directory recursively
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

// Scan file for icon imports
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(srcDir, filePath);
  
  results.totalFiles++;
  
  // Check each library
  for (const [lib, pattern] of Object.entries(patterns)) {
    const matches = content.match(pattern);
    if (matches) {
      if (!results[lib].has(relativePath)) {
        results[lib].set(relativePath, new Set());
      }
      
      // Extract actual icon names
      const importRegex = lib === 'mui' 
        ? /import\s+(?:{\s*([^}]+)\s*}|(\w+))\s+from\s+['"]@mui\/icons-material(?:\/(\w+))?['"]/g
        : lib === 'reactIcons'
        ? /import\s+{\s*([^}]+)\s*}\s+from\s+['"]react-icons\/\w+['"]/g
        : lib === 'heroIcons'
        ? /import\s+{\s*([^}]+)\s*}\s+from\s+['"]@heroicons\/react['"]/g
        : /import\s+{\s*([^}]+)\s*}\s+from\s+['"]lucide-react['"]/g;
      
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const icons = (match[1] || match[2] || '').split(',').map(s => s.trim()).filter(Boolean);
        icons.forEach(icon => results[lib].get(relativePath).add(icon));
      }
    }
  }
}

// Generate report
function generateReport() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║           ICON LIBRARY ANALYSIS REPORT               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log(`📊 Total files scanned: ${results.totalFiles}\n`);
  
  // MUI Icons
  if (results.mui.size > 0) {
    console.log('❌ @mui/icons-material (REMOVE - ~220KB)');
    console.log('─'.repeat(60));
    console.log(`   Files using: ${results.mui.size}`);
    console.log('\n   Files and suggested replacements:\n');
    
    for (const [file, icons] of results.mui.entries()) {
      console.log(`   📄 ${file}`);
      for (const icon of icons) {
        const replacement = iconMapping[icon] || iconMapping[icon.replace('Icon', '')] || icon;
        console.log(`      • ${icon} → ${replacement}`);
      }
      console.log();
    }
  }
  
  // react-icons
  if (results.reactIcons.size > 0) {
    console.log('❌ react-icons (REMOVE - ~70KB)');
    console.log('─'.repeat(60));
    console.log(`   Files using: ${results.reactIcons.size}`);
    console.log('\n   Files and suggested replacements:\n');
    
    for (const [file, icons] of results.reactIcons.entries()) {
      console.log(`   📄 ${file}`);
      for (const icon of icons) {
        const replacement = iconMapping[icon] || icon.replace(/^(Fi|Fa|Fc)/, '');
        console.log(`      • ${icon} → ${replacement}`);
      }
      console.log();
    }
  }
  
  // @heroicons/react
  if (results.heroIcons.size > 0) {
    console.log('⚠️  @heroicons/react (NOT USED - SAFE TO REMOVE)');
    console.log('─'.repeat(60));
    console.log(`   Files using: ${results.heroIcons.size}\n`);
  } else {
    console.log('✅ @heroicons/react (NOT USED - SAFE TO REMOVE)\n');
  }
  
  // lucide-react
  if (results.lucide.size > 0) {
    console.log('✅ lucide-react (KEEP - ~15KB with tree-shaking)');
    console.log('─'.repeat(60));
    console.log(`   Files using: ${results.lucide.size}\n`);
  }
  
  // Savings summary
  console.log('\n💰 ESTIMATED SAVINGS');
  console.log('─'.repeat(60));
  let totalSavings = 0;
  
  if (results.mui.size > 0) {
    console.log('   @mui/icons-material removal:  ~220 KB');
    totalSavings += 220;
  }
  
  if (results.reactIcons.size > 0) {
    console.log('   react-icons removal:          ~70 KB');
    totalSavings += 70;
  }
  
  if (results.heroIcons.size === 0) {
    console.log('   @heroicons/react removal:     ~50 KB');
    totalSavings += 50;
  }
  
  console.log('   ─'.repeat(30));
  console.log(`   TOTAL BUNDLE REDUCTION:       ~${totalSavings} KB\n`);
  
  // Files requiring changes
  const filesToChange = new Set([
    ...results.mui.keys(),
    ...results.reactIcons.keys()
  ]);
  
  if (filesToChange.size > 0) {
    console.log('📝 FILES REQUIRING CHANGES');
    console.log('─'.repeat(60));
    console.log(`   Total: ${filesToChange.size} files\n`);
    
    // Group by type
    const adminFiles = [];
    const vendorFiles = [];
    const componentFiles = [];
    
    for (const file of filesToChange) {
      if (file.includes('Admin/')) adminFiles.push(file);
      else if (file.includes('Vendor/')) vendorFiles.push(file);
      else componentFiles.push(file);
    }
    
    if (adminFiles.length > 0) {
      console.log(`   Admin Pages (${adminFiles.length}):`);
      adminFiles.forEach(f => console.log(`      • ${f}`));
      console.log();
    }
    
    if (vendorFiles.length > 0) {
      console.log(`   Vendor Pages (${vendorFiles.length}):`);
      vendorFiles.forEach(f => console.log(`      • ${f}`));
      console.log();
    }
    
    if (componentFiles.length > 0) {
      console.log(`   Components (${componentFiles.length}):`);
      componentFiles.forEach(f => console.log(`      • ${f}`));
      console.log();
    }
  }
  
  console.log('\n✨ RECOMMENDED ACTION PLAN:');
  console.log('─'.repeat(60));
  console.log('   1. Replace MUI icons with lucide-react equivalents');
  console.log('   2. Replace react-icons with lucide-react equivalents');
  console.log('   3. Remove unused @heroicons/react from package.json');
  console.log('   4. Rebuild and verify functionality');
  console.log('   5. Measure bundle size reduction\n');
}

// Run analysis
try {
  console.log('🔍 Scanning icon library usage...\n');
  scanDirectory(srcDir);
  generateReport();
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}
