const sharp = require('sharp');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

class WatermarkService {
  constructor() {
    this.watermarkText = 'International Tijarat';
    this.watermarkOpacity = 0.12; // Even more subtle - 12% opacity
    this.watermarkSize = 0.08; // Smaller size - 8% of image width
    this.logoOpacity = 0.15; // For logo watermark
  }

  /**
   * Create a professional, subtle watermark overlay
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {string} text - Watermark text
   * @returns {Buffer} Watermark overlay as PNG buffer
   */
  async createWatermarkOverlay(width, height, text = this.watermarkText) {
    try {
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Calculate font size - much smaller and professional
      const fontSize = Math.max(width * this.watermarkSize / text.length, 14);
      
      // Set professional font properties
      ctx.font = `${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = `rgba(255, 255, 255, ${this.watermarkOpacity})`; // White text
      ctx.strokeStyle = `rgba(0, 0, 0, ${this.watermarkOpacity * 0.3})`; // Subtle black outline
      ctx.lineWidth = 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Professional positioning - fewer, strategic placements for speed
      const positions = [
        { x: width * 0.85, y: height * 0.15, rotation: -15 }, // Top right only
        { x: width * 0.15, y: height * 0.85, rotation: -15 }  // Bottom left only
      ];

      // Draw watermarks with professional styling - optimized for speed
      positions.forEach((pos, index) => {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate((pos.rotation * Math.PI) / 180);
        
        // Draw text with subtle outline
        ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);
        
        ctx.restore();
      });

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('❌ Error creating watermark overlay:', error);
      throw error;
    }
  }

  /**
   * Apply professional watermark to an image
   * @param {string} inputPath - Path to input image
   * @param {string} outputPath - Path for output image
   * @param {Object} options - Watermark options
   * @returns {Promise<string>} Path to watermarked image
   */
  async applyWatermark(inputPath, outputPath, options = {}) {
    try {
      console.log(`🎨 [WATERMARK] Processing: ${path.basename(inputPath)}`);
      
      // Get image metadata
      const metadata = await sharp(inputPath).metadata();
      const { width, height, format } = metadata;

      console.log(`📐 [WATERMARK] Dimensions: ${width}x${height}, Format: ${format}`);

      // Skip very small images (thumbnails) for faster processing
      if (width < 150 || height < 150) {
        console.log(`⏭️ [WATERMARK] Skipping small image: ${width}x${height}`);
        fs.copyFileSync(inputPath, outputPath);
        return outputPath;
      }

      // Create professional watermark overlay
      const watermarkOverlay = await this.createWatermarkOverlay(
        width, 
        height, 
        options.text || this.watermarkText
      );

      // Apply watermark with optimized quality settings for speed
      const sharpInstance = sharp(inputPath);
      
      await sharpInstance
        .composite([{
          input: watermarkOverlay,
          top: 0,
          left: 0,
          blend: 'overlay'
        }])
        .jpeg({ 
          quality: 85, // Slightly lower quality for faster processing
          progressive: false, // Disable progressive for speed
          mozjpeg: false // Disable mozjpeg for speed
        })
        .png({
          compressionLevel: 3, // Lower compression for speed
          progressive: false
        })
        .toFile(outputPath);

      console.log(`✅ [WATERMARK] Applied successfully: ${path.basename(outputPath)}`);
      return outputPath;

    } catch (error) {
      console.error('❌ [WATERMARK] Error applying watermark:', error);
      // If watermarking fails, copy original file
      fs.copyFileSync(inputPath, outputPath);
      throw error;
    }
  }

  /**
   * Process uploaded image with watermark
   * @param {Object} file - Multer file object
   * @param {string} uploadDir - Upload directory
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed file info
   */
  async processUploadedImage(file, uploadDir, options = {}) {
    try {
      const originalPath = file.path;
      const filename = file.filename;
      
      console.log(`🔄 [WATERMARK] Processing uploaded file: ${filename}`);

      // Create watermarked version in same location
      const watermarkedPath = originalPath + '_watermarked';
      
      // Apply watermark
      await this.applyWatermark(originalPath, watermarkedPath, options);

      // Replace original with watermarked version
      if (options.replaceOriginal !== false) {
        fs.unlinkSync(originalPath);
        fs.renameSync(watermarkedPath, originalPath);
        
        console.log(`✅ [WATERMARK] Replaced original with watermarked version: ${filename}`);
        
        return {
          filename: filename,
          path: originalPath,
          watermarked: true
        };
      }

      return {
        originalFilename: filename,
        watermarkedPath: watermarkedPath,
        watermarked: true
      };

    } catch (error) {
      console.error('❌ [WATERMARK] Error processing uploaded image:', error);
      return {
        filename: file.filename,
        path: file.path,
        watermarked: false,
        error: error.message
      };
    }
  }

  /**
   * Batch process multiple images
   */
  async batchProcessImages(files, uploadDir, options = {}) {
    try {
      console.log(`🔄 [WATERMARK] Batch processing ${files.length} images`);
      
      const processedFiles = [];
      
      for (const file of files) {
        const processedFile = await this.processUploadedImage(file, uploadDir, options);
        processedFiles.push(processedFile);
      }
      
      console.log(`✅ [WATERMARK] Batch processing completed: ${processedFiles.length} images processed`);
      return processedFiles;
      
    } catch (error) {
      console.error('❌ [WATERMARK] Error in batch processing:', error);
      throw error;
    }
  }

  /**
   * Create thumbnail with watermark
   */
  async createWatermarkedThumbnail(inputPath, outputPath, size = 300) {
    try {
      console.log(`🖼️ [WATERMARK] Creating watermarked thumbnail: ${size}px`);

      // Create smaller, subtle watermark for thumbnails
      const thumbnailWatermark = await this.createWatermarkOverlay(size, size, 'IT');

      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .composite([{
          input: thumbnailWatermark,
          blend: 'overlay'
        }])
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      console.log(`✅ [WATERMARK] Thumbnail created: ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error('❌ [WATERMARK] Error creating thumbnail:', error);
      throw error;
    }
  }
}

module.exports = new WatermarkService();
