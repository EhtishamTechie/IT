/**
 * Frontend Image SEO Utilities
 * Provides client-side image SEO optimization helpers
 */

/**
 * Generate SEO-friendly alt text for images
 * @param {Object} data - Product/category data
 * @param {string} type - Type: 'product', 'category', 'vendor'
 * @param {number} index - Image index for multiple images
 * @returns {string} Optimized alt text
 */
export const generateAltText = (data, type = 'product', index = 0) => {
  const siteName = 'International Tijarat';
  
  try {
    switch (type) {
      case 'product':
        const productName = data.name || data.title || 'Product';
        const category = data.category || data.mainCategory || '';
        const brand = data.brand || '';
        
        if (index === 0) {
          // Main product image
          return `${productName}${brand ? ` by ${brand}` : ''}${category ? ` - ${category}` : ''} - Buy online at ${siteName}`;
        } else {
          // Additional product images
          return `${productName} - View ${index + 1}${category ? ` - ${category}` : ''} - ${siteName}`;
        }
        
      case 'category':
        const categoryName = data.name || 'Category';
        return `${categoryName} products - Shop quality ${categoryName.toLowerCase()} at ${siteName}`;
        
      case 'vendor':
        const businessName = data.businessName || 'Vendor';
        return `${businessName} - Quality products and services at ${siteName}`;
        
      default:
        return `Quality products and services at ${siteName}`;
    }
  } catch (error) {
    console.error('Error generating alt text:', error);
    return `Quality products at ${siteName}`;
  }
};

/**
 * Validate image file before upload
 * @param {File} file - Image file to validate
 * @returns {Object} Validation result
 */
export const validateImageFile = (file) => {
  const issues = [];
  const recommendations = [];
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    issues.push('Invalid file type. Use JPG, PNG, WebP, or GIF.');
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    issues.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 5MB limit.`);
    recommendations.push('Compress the image before uploading.');
  }
  
  // Check filename
  const filename = file.name.toLowerCase();
  if (!/^[a-z0-9-_.\s]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    recommendations.push('Use descriptive filenames with keywords for better SEO.');
  }
  
  // Size recommendations
  if (file.size < 10 * 1024) { // Less than 10KB
    recommendations.push('Image might be too small for product display.');
  }
  
  return {
    valid: issues.length === 0,
    issues,
    recommendations,
    score: Math.max(0, 100 - (issues.length * 30) - (recommendations.length * 10))
  };
};

/**
 * Generate SEO-friendly filename suggestions
 * @param {Object} data - Product/category data
 * @param {string} originalName - Original filename
 * @returns {string} SEO-friendly filename suggestion
 */
export const suggestSEOFilename = (data, originalName) => {
  try {
    const ext = originalName.split('.').pop().toLowerCase();
    const productName = (data.name || data.title || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    
    const category = (data.category || data.mainCategory || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 15);
    
    const brand = (data.brand || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 15);
    
    let filename = productName;
    if (category) filename = `${category}-${filename}`;
    if (brand) filename = `${filename}-${brand}`;
    
    return `${filename}.${ext}`;
  } catch (error) {
    console.error('Error generating filename suggestion:', error);
    return originalName;
  }
};

/**
 * Extract image dimensions from file
 * @param {File} file - Image file
 * @returns {Promise<Object>} Image dimensions
 */
export const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    
    img.src = url;
  });
};

/**
 * Analyze image SEO score
 * @param {File} file - Image file
 * @param {Object} data - Product/category data
 * @param {string} altText - Alt text
 * @returns {Promise<Object>} SEO score analysis
 */
export const analyzeImageSEO = async (file, data, altText) => {
  try {
    const fileValidation = validateImageFile(file);
    const dimensions = await getImageDimensions(file);
    
    let score = fileValidation.score;
    const issues = [...fileValidation.issues];
    const recommendations = [...fileValidation.recommendations];
    
    // Check dimensions
    if (dimensions.width < 300 || dimensions.height < 300) {
      score -= 15;
      issues.push('Image dimensions are small for web display.');
      recommendations.push('Use minimum 300x300 pixels for product images.');
    }
    
    if (dimensions.width > 2000 || dimensions.height > 2000) {
      score -= 10;
      recommendations.push('Very large image. Consider resizing for faster loading.');
    }
    
    // Check aspect ratio
    if (Math.abs(dimensions.aspectRatio - 1) > 0.8) {
      score -= 5;
      recommendations.push('Consider using square or near-square images for products.');
    }
    
    // Check alt text
    if (!altText || altText.length < 10) {
      score -= 20;
      issues.push('Alt text is missing or too short.');
      recommendations.push('Add descriptive alt text for accessibility and SEO.');
    } else if (altText.length > 125) {
      score -= 10;
      issues.push('Alt text is too long.');
      recommendations.push('Keep alt text under 125 characters.');
    }
    
    // Check if alt text includes product name
    const productName = data.name || data.title || '';
    if (productName && !altText.toLowerCase().includes(productName.toLowerCase())) {
      score -= 15;
      recommendations.push('Include product name in alt text for better SEO.');
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
      issues,
      recommendations,
      dimensions,
      fileSize: file.size,
      fileName: file.name
    };
  } catch (error) {
    console.error('Error analyzing image SEO:', error);
    return {
      score: 0,
      grade: 'F',
      issues: ['Could not analyze image'],
      recommendations: ['Check image file integrity'],
      dimensions: null,
      fileSize: file.size,
      fileName: file.name
    };
  }
};

/**
 * Generate structured data for images
 * @param {Array} images - Array of image objects
 * @param {Object} product - Product data
 * @returns {Object} Image structured data
 */
export const generateImageStructuredData = (images, product) => {
  if (!images || images.length === 0) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "url": images[0].url || images[0],
    "description": generateAltText(product, 'product', 0),
    "width": "1200",
    "height": "1200",
    "encodingFormat": "image/jpeg",
    "associatedArticle": {
      "@type": "Product",
      "name": product.name || product.title,
      "url": `https://internationaltijarat.com/product/${product.slug || product._id}`
    }
  };
};

/**
 * Image SEO best practices tips
 */
export const imageSEOTips = {
  filename: [
    "Use descriptive, keyword-rich filenames",
    "Include product name and category",
    "Use hyphens to separate words",
    "Keep filenames under 60 characters",
    "Avoid special characters and spaces"
  ],
  altText: [
    "Include product name and key features",
    "Add category or brand for context",
    "Use natural, descriptive language",
    "Keep under 125 characters",
    "Don't start with 'Image of' or 'Picture of'"
  ],
  fileSize: [
    "Optimize images for web (under 500KB)",
    "Use appropriate image formats (JPG for photos, PNG for graphics)",
    "Consider WebP format for better compression",
    "Remove unnecessary metadata",
    "Use compression tools before upload"
  ],
  dimensions: [
    "Use minimum 300x300 pixels for products",
    "Square images work best for product listings",
    "Maximum 2000x2000 pixels for web display",
    "Maintain consistent aspect ratios",
    "Consider mobile viewing experience"
  ]
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Create image preview with SEO analysis
 * @param {File} file - Image file
 * @param {Object} data - Product data
 * @param {string} altText - Alt text
 * @returns {Promise<Object>} Preview with SEO data
 */
export const createImagePreview = async (file, data, altText) => {
  try {
    const preview = URL.createObjectURL(file);
    const seoAnalysis = await analyzeImageSEO(file, data, altText);
    const suggestedFilename = suggestSEOFilename(data, file.name);
    const suggestedAltText = generateAltText(data, 'product', 0);
    
    return {
      file,
      preview,
      seoAnalysis,
      suggestedFilename,
      suggestedAltText,
      currentAltText: altText
    };
  } catch (error) {
    console.error('Error creating image preview:', error);
    return {
      file,
      preview: URL.createObjectURL(file),
      seoAnalysis: { score: 0, grade: 'F', issues: ['Preview error'], recommendations: [] },
      suggestedFilename: file.name,
      suggestedAltText: '',
      currentAltText: altText
    };
  }
};

export default {
  generateAltText,
  validateImageFile,
  suggestSEOFilename,
  getImageDimensions,
  analyzeImageSEO,
  generateImageStructuredData,
  imageSEOTips,
  formatFileSize,
  createImagePreview
};