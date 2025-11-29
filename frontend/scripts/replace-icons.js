/**
 * Automated Icon Replacement Script
 * Replaces MUI and react-icons with lucide-react equivalents
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon mapping from MUI/react-icons to lucide-react
const iconMapping = {
  // MUI Material Icons
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
  
  // react-icons/fi (Feather Icons)
  'FiX': 'X',
  'FiPackage': 'Package',
  'FiEdit': 'Edit',
  'FiPlus': 'Plus',
  'FiMinus': 'Minus',
  'FiSave': 'Save',
  'FiAlert': 'AlertCircle',
  'FiAlertTriangle': 'AlertTriangle',
  'FiTrendingUp': 'TrendingUp',
  'FiBarChart2': 'BarChart2',
  'FiSearch': 'Search',
  'FiEye': 'Eye',
  'FiFilter': 'Filter',
  'FiDownload': 'Download',
  'FiRefreshCw': 'RefreshCw',
  'FiTruck': 'Truck',
  'FiDollarSign': 'DollarSign',
  'FiShoppingCart': 'ShoppingCart',
  'FiCheck': 'Check',
  
  // react-icons/fa (Font Awesome)
  'FaArrowLeft': 'ArrowLeft',
  'FaClock': 'Clock',
  'FaRocket': 'Rocket'
};

// Files to process (from analysis)
const filesToProcess = [
  'components/admin/homepage/BannerManagement.jsx',
  'components/admin/homepage/BannerManagement.simplified.jsx',
  'components/admin/homepage/BannerManagement.temp.jsx',
  'components/admin/homepage/BannerManagementNew.jsx',
  'components/admin/homepage/BannerPreview.jsx',
  'components/admin/homepage/components/BannerPreview.jsx',
  'components/admin/homepage/components/ProductCard.jsx',
  'components/admin/homepage/components/ProductSelectionModal.jsx',
  'components/admin/homepage/SpecialProductsManager.jsx',
  'components/ComingSoon.jsx',
  'components/Vendor/InventoryDetailModal.jsx',
  'pages/Vendor/InventoryManagement.jsx'
];

let totalChanges = 0;
let filesModified = 0;

function replaceIconsInFile(filePath) {
  const fullPath = path.join(__dirname, '../src', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let fileChanges = 0;
  
  // Step 1: Replace MUI imports
  const muiImportRegex = /import\s+(?:{\s*([^}]+)\s*}|(\w+))\s+from\s+['"]@mui\/icons-material(?:\/(\w+))?['"];?\n?/g;
  
  let muiIcons = new Set();
  let match;
  
  while ((match = muiImportRegex.exec(content)) !== null) {
    const icons = (match[1] || match[2] || '').split(',').map(s => s.trim().replace(/\s+as\s+\w+/, '')).filter(Boolean);
    icons.forEach(icon => {
      const baseIcon = icon.replace('Icon', '');
      if (iconMapping[icon] || iconMapping[baseIcon]) {
        muiIcons.add(icon);
      }
    });
  }
  
  // Remove MUI imports
  content = content.replace(muiImportRegex, '');
  
  // Step 2: Replace react-icons imports
  const reactIconsRegex = /import\s+{\s*([^}]+)\s*}\s+from\s+['"]react-icons\/\w+['"];?\n?/g;
  
  let reactIcons = new Set();
  while ((match = reactIconsRegex.exec(content)) !== null) {
    const icons = match[1].split(',').map(s => s.trim()).filter(Boolean);
    icons.forEach(icon => {
      if (iconMapping[icon]) {
        reactIcons.add(icon);
      }
    });
  }
  
  // Remove react-icons imports
  content = content.replace(reactIconsRegex, '');
  
  // Step 3: Build lucide-react import with all needed icons
  const allIcons = new Set([...muiIcons, ...reactIcons]);
  const lucideIcons = new Set();
  
  allIcons.forEach(icon => {
    const replacement = iconMapping[icon] || iconMapping[icon.replace('Icon', '')];
    if (replacement) {
      lucideIcons.add(replacement);
    }
  });
  
  // Check if file already imports from lucide-react
  const existingLucideMatch = content.match(/import\s+{\s*([^}]+)\s*}\s+from\s+['"]lucide-react['"];?/);
  
  if (existingLucideMatch) {
    // Add new icons to existing import
    const existingIcons = existingLucideMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    existingIcons.forEach(icon => lucideIcons.add(icon));
    
    const sortedIcons = Array.from(lucideIcons).sort().join(', ');
    content = content.replace(
      /import\s+{\s*[^}]+\s*}\s+from\s+['"]lucide-react['"];?/,
      `import { ${sortedIcons} } from 'lucide-react';`
    );
  } else {
    // Add new lucide-react import after first import statement
    const sortedIcons = Array.from(lucideIcons).sort().join(', ');
    const firstImportMatch = content.match(/^import\s+.*?;?\n/m);
    
    if (firstImportMatch) {
      const insertPosition = firstImportMatch.index + firstImportMatch[0].length;
      content = content.slice(0, insertPosition) + 
                `import { ${sortedIcons} } from 'lucide-react';\n` +
                content.slice(insertPosition);
    }
  }
  
  // Step 4: Replace icon usage in JSX
  allIcons.forEach(oldIcon => {
    const newIcon = iconMapping[oldIcon] || iconMapping[oldIcon.replace('Icon', '')];
    if (newIcon) {
      // Replace component usage: <OldIcon /> or <OldIcon>
      const usageRegex = new RegExp(`<${oldIcon}([\\s>])`, 'g');
      const usageMatches = content.match(usageRegex);
      if (usageMatches) {
        content = content.replace(usageRegex, `<${newIcon}$1`);
        fileChanges += usageMatches.length;
      }
      
      // Replace closing tags: </OldIcon>
      const closingRegex = new RegExp(`</${oldIcon}>`, 'g');
      const closingMatches = content.match(closingRegex);
      if (closingMatches) {
        content = content.replace(closingRegex, `</${newIcon}>`);
      }
    }
  });
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath}`);
    console.log(`   └─ Replaced ${fileChanges} icon usages\n`);
    filesModified++;
    totalChanges += fileChanges;
  } else {
    console.log(`⚠️  ${filePath} - No changes needed\n`);
  }
}

// Main execution
console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║        AUTOMATED ICON REPLACEMENT SCRIPT             ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log(`📝 Processing ${filesToProcess.length} files...\n`);

filesToProcess.forEach(file => {
  try {
    replaceIconsInFile(file);
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
});

console.log('\n' + '─'.repeat(60));
console.log(`\n✨ SUMMARY:`);
console.log(`   Files modified: ${filesModified}/${filesToProcess.length}`);
console.log(`   Total icon replacements: ${totalChanges}`);
console.log(`\n💰 Expected bundle reduction: ~290 KB\n`);
console.log('📋 NEXT STEPS:');
console.log('   1. Review changes (git diff)');
console.log('   2. Remove unused packages from package.json:');
console.log('      npm uninstall @mui/icons-material react-icons @heroicons/react');
console.log('   3. Rebuild: npm run build');
console.log('   4. Test functionality in admin panel\n');
