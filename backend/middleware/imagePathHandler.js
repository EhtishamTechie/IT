const path = require('path');
const fs = require('fs');

const imagePathHandler = (req, res, next) => {
  // Log incoming request
  console.log('🎯 [IMAGE] Request received:', {
    originalUrl: req.originalUrl,
    url: req.url,
    path: req.path,
    cleanPath: path.normalize(req.path)
  });

  // Handle vendor logo paths
  if (req.url.includes('vendor-logos/')) {
    const filename = path.basename(req.url);
    const possiblePaths = [
      path.join(__dirname, '../uploads/vendor-logos', filename),
      path.join(__dirname, '../uploads', filename)
    ];

    // Log possible paths
    console.log('📸 Image request:', {
      url: req.url,
      path: req.path,
      cleanPath: path.normalize(req.path),
      filename,
      possiblePaths
    });

    // Try to find the file in possible locations
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log('✅ [STATIC] Found file:', filePath);
        return res.sendFile(filePath);
      }
    }

    // If file not found, log and send 404
    console.log('❌ [STATIC] File not found in any location');
    return res.status(404).send('Image not found');
  }

  next();
};

module.exports = imagePathHandler;
