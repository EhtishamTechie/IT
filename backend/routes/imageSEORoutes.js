const express = require('express');
const router = express.Router();
const imageOptimizationService = require('../services/imageOptimizationService');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

/**
 * Image SEO Analysis and Management Routes
 */

// Get image SEO analysis for all products
router.get('/analysis', async (req, res) => {
  try {
    const { page = 1, limit = 50, filter } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    // Apply filters based on request
    switch (filter) {
      case 'missing-alt':
        query = { $or: [{ altText: { $exists: false } }, { altText: '' }] };
        break;
      case 'no-images':
        query = { 
          $or: [
            { images: { $exists: false } }, 
            { images: { $size: 0 } },
            { image: { $exists: false } },
            { image: '' }
          ] 
        };
        break;
      default:
        break;
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('vendor', 'businessName')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalProducts = await Product.countDocuments(query);

    // Analyze each product's image SEO
    const analysis = [];
    
    for (const product of products) {
      const imageCount = (product.images?.length || 0) + (product.image ? 1 : 0);
      
      // Calculate SEO score based on various factors
      let score = 100;
      const issues = [];
      
      // Check for images
      if (imageCount === 0) {
        score -= 40;
        issues.push('No images uploaded');
      }
      
      // Check alt text
      if (!product.altText || product.altText.length < 10) {
        score -= 25;
        issues.push('Missing or inadequate alt text');
      } else if (product.altText.length > 125) {
        score -= 10;
        issues.push('Alt text too long');
      }
      
      // Check if alt text includes product name
      if (product.altText && product.name && 
          !product.altText.toLowerCase().includes(product.name.toLowerCase().substring(0, 10))) {
        score -= 15;
        issues.push('Alt text doesn\'t include product name');
      }
      
      // Check filename quality (basic check)
      if (product.image && !product.image.includes(product.name?.toLowerCase().replace(/\s+/g, '-').substring(0, 15))) {
        score -= 10;
        issues.push('Filename not SEO-friendly');
      }
      
      // Ensure score doesn't go below 0
      score = Math.max(0, score);
      
      analysis.push({
        productId: product._id,
        name: product.name,
        category: product.category?.name || 'Uncategorized',
        vendor: product.vendor?.businessName || 'Admin',
        imageCount,
        altText: product.altText || '',
        seoScore: score,
        grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
        issues,
        images: product.images || [],
        mainImage: product.image || ''
      });
    }

    // Calculate overall statistics
    const stats = {
      totalProducts,
      totalImages: analysis.reduce((sum, item) => sum + item.imageCount, 0),
      averageScore: Math.round(analysis.reduce((sum, item) => sum + item.seoScore, 0) / analysis.length) || 0,
      gradeDistribution: {
        A: analysis.filter(item => item.grade === 'A').length,
        B: analysis.filter(item => item.grade === 'B').length,
        C: analysis.filter(item => item.grade === 'C').length,
        D: analysis.filter(item => item.grade === 'D').length,
        F: analysis.filter(item => item.grade === 'F').length
      },
      commonIssues: {
        missingAltText: analysis.filter(item => item.issues.some(issue => issue.includes('alt text'))).length,
        noImages: analysis.filter(item => item.imageCount === 0).length,
        poorFilenames: analysis.filter(item => item.issues.some(issue => issue.includes('filename'))).length
      }
    };

    res.json({
      success: true,
      data: {
        products: analysis,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / limit),
          totalProducts,
          hasNextPage: skip + analysis.length < totalProducts,
          hasPreviousPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error in image SEO analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze image SEO',
      error: error.message
    });
  }
});

// Get detailed image analysis for a specific product
router.get('/product/:productId/analysis', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findById(productId)
      .populate('category', 'name')
      .populate('vendor', 'businessName')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const detailedAnalysis = {
      product: {
        id: product._id,
        name: product.name,
        category: product.category?.name,
        vendor: product.vendor?.businessName
      },
      images: []
    };

    // Analyze each image
    const allImages = [];
    if (product.image) allImages.push({ path: product.image, type: 'main' });
    if (product.images) {
      product.images.forEach(img => allImages.push({ path: img, type: 'additional' }));
    }

    for (let i = 0; i < allImages.length; i++) {
      const imageInfo = allImages[i];
      const imagePath = path.join(__dirname, '../uploads/products', imageInfo.path);
      
      let analysis = {
        filename: imageInfo.path,
        type: imageInfo.type,
        index: i,
        exists: false,
        seoScore: 0,
        issues: [],
        recommendations: []
      };

      // Check if file exists
      if (fs.existsSync(imagePath)) {
        analysis.exists = true;
        
        try {
          // Get image metadata and validation
          const validation = await imageOptimizationService.validateImageSEO(imagePath, product);
          const metadata = await imageOptimizationService.extractImageMetadata(imagePath);
          
          analysis = {
            ...analysis,
            ...validation,
            metadata,
            suggestedAltText: imageOptimizationService.generateAltText(product, 'product', i),
            suggestedFilename: imageOptimizationService.generateSEOFilename(product, imageInfo.path, 'product')
          };
        } catch (error) {
          console.error(`Error analyzing image ${imageInfo.path}:`, error);
          analysis.issues.push('Could not analyze image file');
        }
      } else {
        analysis.issues.push('Image file not found on server');
      }

      detailedAnalysis.images.push(analysis);
    }

    // Overall product image SEO score
    const overallScore = detailedAnalysis.images.length > 0 
      ? Math.round(detailedAnalysis.images.reduce((sum, img) => sum + img.seoScore, 0) / detailedAnalysis.images.length)
      : 0;

    detailedAnalysis.overallScore = overallScore;
    detailedAnalysis.grade = overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F';

    res.json({
      success: true,
      data: detailedAnalysis
    });

  } catch (error) {
    console.error('Error in detailed image analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze product images',
      error: error.message
    });
  }
});

// Bulk optimize images SEO
router.post('/optimize-batch', async (req, res) => {
  try {
    const { productIds, operations } = req.body;
    
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    const results = [];
    
    for (const productId of productIds) {
      try {
        const product = await Product.findById(productId);
        if (!product) {
          results.push({
            productId,
            success: false,
            message: 'Product not found'
          });
          continue;
        }

        const updates = {};
        
        // Auto-generate alt text if requested
        if (operations.includes('generate-alt-text')) {
          if (!product.altText || product.altText.length < 10) {
            updates.altText = imageOptimizationService.generateAltText(product, 'product', 0);
          }
        }
        
        // Auto-generate SEO keywords if requested
        if (operations.includes('generate-seo-keywords')) {
          if (!product.seoKeywords || product.seoKeywords.length === 0) {
            const keywords = [
              product.name?.toLowerCase(),
              product.category?.name?.toLowerCase(),
              product.brand?.toLowerCase(),
              'buy online',
              'international tijarat'
            ].filter(Boolean).join(', ');
            
            updates.seoKeywords = keywords;
          }
        }
        
        // Update product if changes were made
        if (Object.keys(updates).length > 0) {
          await Product.findByIdAndUpdate(productId, updates);
          results.push({
            productId,
            success: true,
            updates,
            message: `Updated ${Object.keys(updates).length} SEO field(s)`
          });
        } else {
          results.push({
            productId,
            success: true,
            updates: {},
            message: 'No updates needed'
          });
        }

      } catch (error) {
        results.push({
          productId,
          success: false,
          message: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    res.json({
      success: true,
      message: `Processed ${productIds.length} products, ${successCount} successful`,
      data: {
        results,
        summary: {
          total: productIds.length,
          successful: successCount,
          failed: productIds.length - successCount
        }
      }
    });

  } catch (error) {
    console.error('Error in batch optimization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize images in batch',
      error: error.message
    });
  }
});

// Generate image sitemap for SEO
router.get('/sitemap', async (req, res) => {
  try {
    const products = await Product.find({ 
      $and: [
        { $or: [{ images: { $exists: true, $ne: [] } }, { image: { $exists: true, $ne: '' } }] },
        { isActive: true }
      ]
    })
    .populate('category', 'name slug')
    .select('name slug images image altText category')
    .lean();

    const sitemapEntries = imageOptimizationService.generateImageSitemapEntries(products);

    res.json({
      success: true,
      data: sitemapEntries,
      count: sitemapEntries.length
    });

  } catch (error) {
    console.error('Error generating image sitemap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate image sitemap',
      error: error.message
    });
  }
});

// Get image SEO statistics
router.get('/stats', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const productsWithImages = await Product.countDocuments({
      $or: [
        { images: { $exists: true, $ne: [] } },
        { image: { $exists: true, $ne: '' } }
      ]
    });
    
    const productsWithAltText = await Product.countDocuments({
      altText: { $exists: true, $ne: '' }
    });
    
    const productsWithSEOKeywords = await Product.countDocuments({
      seoKeywords: { $exists: true, $ne: '' }
    });

    // Get total image count
    const imageStats = await Product.aggregate([
      {
        $project: {
          imageCount: {
            $add: [
              { $cond: [{ $ifNull: ['$image', false] }, 1, 0] },
              { $size: { $ifNull: ['$images', []] } }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalImages: { $sum: '$imageCount' },
          avgImagesPerProduct: { $avg: '$imageCount' }
        }
      }
    ]);

    const stats = {
      products: {
        total: totalProducts,
        withImages: productsWithImages,
        withAltText: productsWithAltText,
        withSEOKeywords: productsWithSEOKeywords,
        imageCompletionRate: Math.round((productsWithImages / totalProducts) * 100),
        altTextCompletionRate: Math.round((productsWithAltText / totalProducts) * 100),
        seoKeywordsCompletionRate: Math.round((productsWithSEOKeywords / totalProducts) * 100)
      },
      images: {
        total: imageStats[0]?.totalImages || 0,
        averagePerProduct: Math.round(imageStats[0]?.avgImagesPerProduct || 0)
      },
      recommendations: []
    };

    // Generate recommendations
    if (stats.products.altTextCompletionRate < 80) {
      stats.recommendations.push({
        type: 'warning',
        message: `${totalProducts - productsWithAltText} products missing alt text`,
        action: 'Consider bulk generating alt text for better accessibility and SEO'
      });
    }

    if (stats.products.imageCompletionRate < 90) {
      stats.recommendations.push({
        type: 'info', 
        message: `${totalProducts - productsWithImages} products without images`,
        action: 'Add product images to improve conversion rates'
      });
    }

    if (stats.products.seoKeywordsCompletionRate < 70) {
      stats.recommendations.push({
        type: 'warning',
        message: `${totalProducts - productsWithSEOKeywords} products missing SEO keywords`,
        action: 'Bulk generate SEO keywords for better search visibility'
      });
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting image SEO stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image SEO statistics',
      error: error.message
    });
  }
});

module.exports = router;