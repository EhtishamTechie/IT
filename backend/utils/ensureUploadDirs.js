const fs = require('fs');
const path = require('path');

function ensureUploadDirectories() {
    const baseDir = path.join(__dirname, '..');
    const dirs = [
        path.join(baseDir, 'uploads'),
        path.join(baseDir, 'uploads', 'properties'),
        path.join(baseDir, 'uploads', 'products'),
        path.join(baseDir, 'uploads', 'vendor-logos'),
        path.join(baseDir, 'uploads', 'used-products')
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Created directory: ${dir}`);
            } catch (err) {
                console.error(`❌ Error creating directory ${dir}:`, err);
            }
        }
    });

    // Check for any images in old location and move them
    const oldPropertiesDir = path.join(baseDir, 'properties');
    if (fs.existsSync(oldPropertiesDir)) {
        try {
            const files = fs.readdirSync(oldPropertiesDir);
            files.forEach(file => {
                const oldPath = path.join(oldPropertiesDir, file);
                const newPath = path.join(baseDir, 'uploads', 'properties', file);
                if (!fs.existsSync(newPath)) {
                    try {
                        fs.renameSync(oldPath, newPath);
                        console.log(`📦 Moved file from ${oldPath} to ${newPath}`);
                    } catch (err) {
                        console.error(`❌ Error moving file ${oldPath}:`, err);
                    }
                }
            });
        } catch (err) {
            console.error('❌ Error reading old properties directory:', err);
        }
    }
}

module.exports = ensureUploadDirectories;
