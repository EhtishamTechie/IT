/**
 * Prerender Routes for SEO
 * 
 * These routes generate server-side rendered HTML for search engine crawlers
 * This ensures Googlebot and other crawlers can index the content properly
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const HomepageCategory = require('../models/HomepageCategory');
const Banner = require('../models/Banner');

// Helper to generate HTML for homepage
const generateHomepageHTML = async () => {
  try {
    // Fetch basic data
    const [categories, products, banners] = await Promise.all([
      Category.find({ isActive: true }).limit(10).lean(),
      Product.find({ isActive: true, isVisible: true }).limit(20).select('title price images').lean(),
      Banner.find({ isActive: true }).limit(3).lean()
    ]);

    const baseUrl = process.env.FRONTEND_URL || 'https://internationaltijarat.com';

    // Generate product list HTML
    const productsHTML = products.map(product => `
      <div class="product-item" style="display: inline-block; width: 200px; margin: 10px; vertical-align: top;">
        <a href="${baseUrl}/product/${product._id}" style="text-decoration: none; color: inherit;">
          ${product.images && product.images[0] ? `<img src="${baseUrl}/uploads/products/${product.images[0]}" alt="${product.title}" style="width: 100%; height: 200px; object-fit: cover;" loading="lazy" />` : ''}
          <h3 style="font-size: 14px; margin: 10px 0;">${product.title}</h3>
          <p style="font-weight: bold; color: #e67e22;">Rs. ${product.price}</p>
        </a>
      </div>
    `).join('');

    // Generate categories HTML
    const categoriesHTML = categories.map(cat => `
      <a href="${baseUrl}/category-group/${cat.slug || cat._id}" style="display: inline-block; padding: 10px 20px; margin: 5px; background: #3498db; color: white; text-decoration: none; border-radius: 5px;">
        ${cat.name}
      </a>
    `).join('');

    // Complete HTML document
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>International Tijarat - Premium Online Shopping | Fragrances, Jewelry, Mobile Phones & More</title>
    <meta name="description" content="International Tijarat - Your trusted online marketplace for fragrances, jewelry, mobile phones, accessories, wallets, watches and more. Shop premium products at best prices with fast delivery across Pakistan.">
    <meta name="keywords" content="online shopping Pakistan, perfumes, fragrances, jewelry, mobile phones, mobile accessories, wallets, watches">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${baseUrl}">
    
    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${baseUrl}">
    <meta property="og:title" content="International Tijarat - Premium Online Shopping">
    <meta property="og:description" content="Shop premium fragrances, jewelry, mobile phones and more. Best prices, fast delivery.">
    <meta property="og:site_name" content="International Tijarat">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "International Tijarat",
      "url": "${baseUrl}",
      "description": "Premium online marketplace for fragrances, jewelry, mobile phones and more",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "${baseUrl}/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    }
    </script>
    
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "International Tijarat",
      "url": "${baseUrl}",
      "logo": "${baseUrl}/IT%20logo.jpeg"
    }
    </script>
    
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": [
        ${products.slice(0, 10).map((product, index) => `{
          "@type": "ListItem",
          "position": ${index + 1},
          "item": {
            "@type": "Product",
            "name": "${product.title.replace(/"/g, '\\"')}",
            "url": "${baseUrl}/product/${product._id}",
            "offers": {
              "@type": "Offer",
              "price": "${product.price}",
              "priceCurrency": "PKR",
              "availability": "https://schema.org/InStock"
            }
          }
        }`).join(',')}
      ]
    }
    </script>
    
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        h1 { margin: 0; font-size: 32px; }
        h2 { color: #2c3e50; border-bottom: 3px solid #e67e22; padding-bottom: 10px; margin-top: 40px; }
        .categories { margin: 30px 0; text-align: center; }
        .products { text-align: center; background: white; padding: 20px; margin-top: 20px; border-radius: 10px; }
        .note { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
    </style>
</head>
<body>
    <header>
        <h1>🛍️ International Tijarat</h1>
        <p>Premium Online Shopping in Pakistan</p>
    </header>
    
    <div class="container">
        <div class="note">
            <strong>Note:</strong> This is a simplified version for search engines. 
            <a href="${baseUrl}" style="color: #3498db;">Click here for the full interactive experience</a>
        </div>
        
        <h2>Browse Categories</h2>
        <div class="categories">
            ${categoriesHTML}
        </div>
        
        <h2>Featured Products</h2>
        <div class="products">
            ${productsHTML}
        </div>
        
        <div style="margin-top: 40px; padding: 20px; background: white; border-radius: 10px;">
            <h2>About International Tijarat</h2>
            <p>International Tijarat is your trusted online marketplace offering a wide range of premium products including:</p>
            <ul style="line-height: 2;">
                <li><strong>Fragrances:</strong> Premium perfumes and body sprays for men and women</li>
                <li><strong>Jewelry:</strong> Elegant jewelry pieces including earrings, necklaces, and more</li>
                <li><strong>Mobile Phones:</strong> Latest smartphones and accessories</li>
                <li><strong>Accessories:</strong> Mobile accessories, wallets, watches, and belts</li>
                <li><strong>Fashion:</strong> Hoodies, men shawls, and more</li>
            </ul>
            <p>We offer competitive prices, fast delivery, and excellent customer service across Pakistan.</p>
        </div>
        
        <div style="margin-top: 20px; text-align: center; padding: 20px;">
            <p><a href="${baseUrl}/products" style="color: #3498db;">View All Products</a> | 
               <a href="${baseUrl}/contact" style="color: #3498db;">Contact Us</a> | 
               <a href="${baseUrl}/about" style="color: #3498db;">About Us</a></p>
        </div>
    </div>
    
    <footer style="background: #2c3e50; color: white; text-align: center; padding: 20px; margin-top: 40px;">
        <p>&copy; ${new Date().getFullYear()} International Tijarat. All rights reserved.</p>
    </footer>
    
    <!-- Redirect to SPA after a delay for regular browsers -->
    <script>
        // Only redirect if not a bot
        if (!/bot|crawler|spider|googlebot/i.test(navigator.userAgent)) {
            setTimeout(function() {
                window.location.href = '${baseUrl}';
            }, 1000);
        }
    </script>
</body>
</html>`;

    return html;
  } catch (error) {
    console.error('Error generating homepage HTML:', error);
    throw error;
  }
};

// Prerender homepage route
router.get('/homepage', async (req, res) => {
  try {
    const html = await generateHomepageHTML();
    res.set('Content-Type', 'text/html');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(html);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>International Tijarat</title>
        <meta name="description" content="Premium online marketplace for fragrances, jewelry, mobile phones and more">
      </head>
      <body>
        <h1>International Tijarat</h1>
        <p>Loading... If this page doesn't load, please visit <a href="https://internationaltijarat.com">internationaltijarat.com</a></p>
      </body>
      </html>
    `);
  }
});

// Export both router and function
router.generateHomepageHTML = generateHomepageHTML;
module.exports = router;
