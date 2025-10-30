// Master script to run all SEO fixes in sequence
const { execSync } = require('child_process');

console.log('🚀 Running all SEO fixes in sequence...\n');
console.log('='.repeat(60));

const scripts = [
  { name: 'Fix Category Slugs', file: 'fix-category-slugs-final.js' },
  { name: 'Fix Category Meta Data', file: 'fix-category-meta-data.js' },
  { name: 'Fix Remaining SEO Issues', file: 'fix-remaining-seo-issues.js' },
  { name: 'Trim Long Meta Descriptions', file: 'trim-long-meta-descriptions.js' }
];

for (let i = 0; i < scripts.length; i++) {
  const script = scripts[i];
  console.log(`\n[${i + 1}/${scripts.length}] Running: ${script.name}`);
  console.log('-'.repeat(60));
  
  try {
    execSync(`node scripts/${script.file}`, { stdio: 'inherit' });
    console.log(`✅ ${script.name} completed successfully\n`);
  } catch (error) {
    console.error(`❌ ${script.name} failed!`);
    console.error(error.message);
    process.exit(1);
  }
}

console.log('='.repeat(60));
console.log('\n🎉 All SEO fixes completed successfully!\n');
console.log('📊 Running final SEO analysis...\n');

try {
  execSync('node scripts/analyze-seo-issues.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to run final analysis');
}
