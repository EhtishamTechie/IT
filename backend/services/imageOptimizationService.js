const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Image SEO Optimization Service
 * Handles image naming, alt text generation, and SEO metadata
 */
class ImageOptimizationService {
  constructor() {
    this.optimizedSizes = {
      thumbnail: { width: 300, height: 300 },
      medium: { width: 600, height: 600 },
      large: { width: 1200, height: 1200 }
    };
  }

  /**
   * Generate SEO-friendly filename from product/category data
   * @param {Object} data - Product or category data
   * @param {string} originalName - Original filename
   * @param {string} type - Type: 'product', 'category', 'vendor'
   * @returns {string} SEO optimized filename
   */
  generateSEOFilename(data, originalName, type = 'product') {
    try {
      const ext = path.extname(originalName).toLowerCase();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);

      let baseName = '';
      
      switch (type) {
        case 'product':
          baseName = this.createSlug(data.name || data.title || 'product');
          break;
        case 'category':
          baseName = this.createSlug(data.name || 'category');
          break;
        case 'vendor':
          baseName = this.createSlug(data.businessName || 'vendor');
          break;
        default:
          baseName = 'image';
      }

      // Include category for better SEO
      if (data.category && type === 'product') {
        const categorySlug = this.createSlug(data.category);
        baseName = `${categorySlug}-${baseName}`;
      }

      return `${baseName}-${timestamp}-${random}${ext}`;
    } catch (error) {
      console.error('Error generating SEO filename:', error);
      // Fallback to timestamp-based naming
      const ext = path.extname(originalName).toLowerCase();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      return `image-${timestamp}-${random}${ext}`;
    }
  }

  /**
   * Generate alt text for images based on context
   * @param {Object} data - Product/category data
   * @param {string} type - Image type
   * @param {number} index - Image index for multiple images
   * @returns {string} SEO optimized alt text
   */
  generateAltText(data, type = 'product', index = 0) {
    try {
      const siteName = 'International Tijarat';
      
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
      return 'Quality products at International Tijarat';
    }
  }

  /**
   * Create URL-friendly slug
   * @param {string} text - Text to convert to slug
   * @returns {string} URL-friendly slug
   */
  createSlug(text) {
    if (!text) return 'item';
    
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Trim hyphens from start and end
      .substring(0, 50); // Limit length
  }

  /**
   * Generate responsive image sizes
   * @param {string} inputPath - Path to input image
   * @param {string} outputDir - Output directory
   * @param {string} baseName - Base filename
   * @returns {Promise<Object>} Generated image sizes info
   */
  async generateResponsiveImages(inputPath, outputDir, baseName) {
    try {
      const sizes = {};
      const ext = path.extname(baseName);
      const nameWithoutExt = baseName.replace(ext, '');

      for (const [sizeName, dimensions] of Object.entries(this.optimizedSizes)) {
        const outputPath = path.join(outputDir, `${nameWithoutExt}-${sizeName}${ext}`);
        
        await sharp(inputPath)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 80, progressive: true })
          .toFile(outputPath);
          
        sizes[sizeName] = {
          path: outputPath,
          filename: `${nameWithoutExt}-${sizeName}${ext}`,
          width: dimensions.width,
          height: dimensions.height
        };
      }

      console.log(`✅ Generated ${Object.keys(sizes).length} responsive image sizes`);
      return sizes;
    } catch (error) {
      console.error('Error generating responsive images:', error);
      throw error;
    }
  }

  /**
   * Extract image metadata for SEO
   * @param {string} imagePath - Path to image
   * @returns {Promise<Object>} Image metadata
   */
  async extractImageMetadata(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = fs.statSync(imagePath);
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: stats.size,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
        aspectRatio: metadata.width / metadata.height
      };
    } catch (error) {
      console.error('Error extracting image metadata:', error);
      return null;
    }
  }

  /**
   * Optimize image for web delivery
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeForWeb(inputPath, outputPath, options = {}) {
    try {
      const {
        quality = 85,
        maxWidth = 1920,
        maxHeight = 1920,
        progressive = true,
        stripMetadata = true
      } = options;

      const sharpInstance = sharp(inputPath);
      
      // Get original metadata
      const metadata = await sharpInstance.metadata();
      
      // Resize if necessary
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        sharpInstance.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Apply format-specific optimizations
      if (metadata.format === 'jpeg' || path.extname(outputPath).toLowerCase() === '.jpg') {
        sharpInstance.jpeg({
          quality,
          progressive,
          mozjpeg: true
        });
      } else if (metadata.format === 'png' || path.extname(outputPath).toLowerCase() === '.png') {
        sharpInstance.png({
          quality,
          progressive,
          compressionLevel: 6
        });
      } else if (metadata.format === 'webp' || path.extname(outputPath).toLowerCase() === '.webp') {
        sharpInstance.webp({
          quality,
          effort: 4
        });
      }

      // Remove metadata if requested
      if (stripMetadata) {
        sharpInstance.withMetadata({
          exif: {},
          icc: 'srgb'
        });
      }

      await sharpInstance.toFile(outputPath);

      // Get optimized file stats
      const originalStats = fs.statSync(inputPath);
      const optimizedStats = fs.statSync(outputPath);
      const compressionRatio = ((originalStats.size - optimizedStats.size) / originalStats.size * 100).toFixed(1);

      console.log(`✅ Image optimized: ${compressionRatio}% size reduction`);
      
      return {
        originalSize: originalStats.size,
        optimizedSize: optimizedStats.size,
        compressionRatio: parseFloat(compressionRatio),
        path: outputPath
      };
    } catch (error) {
      console.error('Error optimizing image for web:', error);
      throw error;
    }
  }

  /**
   * Generate image sitemap entries
   * @param {Array} products - Products with images
   * @returns {Array} Image sitemap entries
   */
  generateImageSitemapEntries(products) {
    const entries = [];
    
    products.forEach(product => {
      if (product.images && product.images.length > 0) {
        product.images.forEach((image, index) => {
          const altText = this.generateAltText(product, 'product', index);
          const caption = index === 0 ? 
            `${product.name || product.title} - Main Image` : 
            `${product.name || product.title} - Image ${index + 1}`;
            
          entries.push({
            url: `https://internationaltijarat.com/product/${product.slug || product._id}`,
            image: {
              url: `https://internationaltijarat.com/uploads/${image}`,
              caption,
              title: product.name || product.title,
              alt: altText
            }
          });
        });
      }
    });
    
    return entries;
  }

  /**
   * Validate image for SEO compliance
   * @param {string} imagePath - Path to image
   * @param {Object} data - Associated data
   * @returns {Promise<Object>} Validation results
   */
  async validateImageSEO(imagePath, data = {}) {
    try {
      const metadata = await this.extractImageMetadata(imagePath);
      const filename = path.basename(imagePath);
      const issues = [];
      const recommendations = [];

      // Check file size
      if (metadata.size > 500 * 1024) { // 500KB
        issues.push('Image file size is large (>500KB)');
        recommendations.push('Consider optimizing image for web delivery');
      }

      // Check dimensions
      if (metadata.width > 2000 || metadata.height > 2000) {
        issues.push('Image dimensions are very large');
        recommendations.push('Resize image to maximum 1920x1920 for web');
      }

      if (metadata.width < 300 || metadata.height < 300) {
        issues.push('Image dimensions are small for main product image');
        recommendations.push('Use minimum 300x300 pixels for product images');
      }

      // Check aspect ratio
      if (Math.abs(metadata.aspectRatio - 1) > 0.5) {
        recommendations.push('Consider using square or near-square aspect ratios for product images');
      }

      // Check filename
      if (!/^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
        issues.push('Filename is not SEO-friendly');
        recommendations.push('Use descriptive, hyphen-separated filenames with product keywords');
      }

      return {
        valid: issues.length === 0,
        issues,
        recommendations,
        metadata,
        score: Math.max(0, 100 - (issues.length * 20) - (recommendations.length * 5))
      };
    } catch (error) {
      console.error('Error validating image SEO:', error);
      return {
        valid: false,
        issues: ['Could not validate image'],
        recommendations: ['Check image file integrity'],
        metadata: null,
        score: 0
      };
    }
  }
}

module.exports = new ImageOptimizationService();