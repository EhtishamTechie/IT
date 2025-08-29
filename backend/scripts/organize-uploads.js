const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const productsDir = path.join(uploadsDir, 'products');
const propertiesDir = path.join(uploadsDir, 'properties');
const usedProductsDir = path.join(uploadsDir, 'used-products');
const vendorLogosDir = path.join(uploadsDir, 'vendor-logos');

// Ensure directories exist
[uploadsDir, productsDir, propertiesDir, usedProductsDir, vendorLogosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Move files to appropriate directories
fs.readdirSync(uploadsDir).forEach(file => {
  const filePath = path.join(uploadsDir, file);
  if (fs.statSync(filePath).isFile()) {
    let targetDir = null;
    // Handle product images
    if (file.startsWith('product-')) {
      targetDir = productsDir;
    }
    // Handle property images
    else if (file.startsWith('property-')) {
      targetDir = propertiesDir;
    }
    // Handle used product images
    else if (file.startsWith('used-product-')) {
      targetDir = usedProductsDir;
    }
    // Handle vendor logo images
    else if (file.startsWith('vendor-')) {
      targetDir = vendorLogosDir;
    }

    if (targetDir) {
      const newPath = path.join(targetDir, file);
      if (!fs.existsSync(newPath)) {
        fs.renameSync(filePath, newPath);
        console.log(`Moved ${file} to ${path.basename(targetDir)} directory`);
      }
    }
  }
});

console.log('Upload directory organization complete');
