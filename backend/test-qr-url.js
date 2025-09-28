// Quick test for QR code URL generation
const account = {
  qrCode: 'uploads\\qr-codes\\qr-1758971446445-896435240.jpg'
};

// Simulate getImageUrl function logic
const IMAGE_PATHS = {
  'qr-codes': 'qr-codes'
};

const getImageUrl = (type, originalFilename) => {
  if (!originalFilename || !type) {
    return '/assets/no-image.png';
  }

  let filename = Array.isArray(originalFilename) ? originalFilename[0] : originalFilename;

  // Handle data URLs (for image previews)
  if (filename.startsWith('data:')) {
    return filename;
  }

  // If it's already a full URL
  if (filename.startsWith('http')) {
    return filename;
  }

  // Clean up any prefixes and get just the filename
  const cleanFilename = filename
    .replace(/^\/uploads\/products\//, '')
    .replace(/^uploads\/products\//, '')
    .replace(/^\/uploads\//, '')
    .replace(/^uploads\//, '')
    .replace(/^products\//, '')
    .replace(/^\/products\//, '')
    .split('/')
    .pop()
    .split('\\')
    .pop();

  console.log('Original filename:', originalFilename);
  console.log('Clean filename:', cleanFilename);

  // Build the relative path based on type
  let relativeUrl = '';
  if (IMAGE_PATHS[type]) {
    relativeUrl = `/uploads/${IMAGE_PATHS[type]}/${cleanFilename}`;
  } else {
    relativeUrl = `/uploads/${cleanFilename}`;
  }

  console.log('Relative URL:', relativeUrl);

  // For development, use the full URL
  const BASE_URL = 'http://localhost:3001';
  return `${BASE_URL}${relativeUrl}`;
};

const result = getImageUrl('qr-codes', account.qrCode);
console.log('Final URL:', result);