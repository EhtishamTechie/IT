const fs = require('fs');
const path = require('path');

function fixProductImages() {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const productsDir = path.join(__dirname, '..', 'uploads', 'products');

    // Create products directory if it doesn't exist
    if (!fs.existsSync(productsDir)) {
        fs.mkdirSync(productsDir, { recursive: true });
    }

    // Get all files in the uploads directory
    const files = fs.readdirSync(uploadsDir);

    files.forEach(file => {
        // Check if the file is an image and follows our naming pattern
        if (file.match(/^(image-|product-).*\.(jpg|jpeg|png|gif)$/i)) {
            const sourcePath = path.join(uploadsDir, file);
            const destPath = path.join(productsDir, file);

            // Only move if it's a file and it's in the wrong location
            if (fs.statSync(sourcePath).isFile() && sourcePath !== destPath) {
                try {
                    // Move the file to products directory
                    fs.renameSync(sourcePath, destPath);
                    console.log(`✅ Moved ${file} to products directory`);
                } catch (err) {
                    console.error(`❌ Error moving ${file}: ${err.message}`);
                }
            }
        }
    });

    console.log('🔍 Product image fix completed');
}

module.exports = fixProductImages;
