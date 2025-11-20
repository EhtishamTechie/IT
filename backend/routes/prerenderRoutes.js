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
const HomepageBanner = require('../models/HomepageBanner');

// Helper to generate HTML for homepage
const generateHomepageHTML = async () => {
  try {
    // Fetch ALL homepage data - same as the API endpoint
    const [categories, banners, allProducts] = await Promise.all([
      Category.find({ isActive: true }).limit(20).lean(),
      HomepageBanner.find({ isActive: true }).limit(5).lean(),
      Product.find({ isActive: true, isVisible: true })
        .sort({ createdAt: -1 })
        .limit(60)
        .select('title price images stock slug isPremium isFeatured createdAt')
        .lean()
    ]);

    // Split products into different sections
    const premium = allProducts.filter(p => p.isPremium).slice(0, 24);
    const featured = allProducts.filter(p => p.isFeatured).slice(0, 16);
    const newArrivals = allProducts.slice(0, 20);
    
    // If no premium/featured, use regular products
    if (premium.length === 0) {
      premium.push(...allProducts.slice(0, 24));
    }
    if (featured.length === 0) {
      featured.push(...allProducts.slice(0, 16));
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://internationaltijarat.com';
    const allProductsForSchema = [...new Set([...premium, ...featured, ...newArrivals])];

    // Generate banners HTML
    const bannersHTML = banners.map(banner => `
      <div class="banner-item" style="margin-bottom: 20px;">
        <img src="${baseUrl}${banner.image}" alt="${banner.title}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 10px;" loading="eager" />
      </div>
    `).join('');

    // Generate premium products HTML
    const premiumHTML = premium.map(product => `
      <div class="product-card" style="display: inline-block; width: 220px; margin: 10px; vertical-align: top; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; background: white;">
        <a href="${baseUrl}/product/${product.slug || product._id}" style="text-decoration: none; color: inherit;">
          ${product.images && product.images[0] ? `<img src="${baseUrl}/uploads/${product.images[0]}" alt="${product.title}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 6px;" loading="lazy" />` : ''}
          <h3 style="font-size: 14px; margin: 12px 0 8px; height: 40px; overflow: hidden; color: #333;">${product.title}</h3>
          <p style="font-weight: bold; color: #e67e22; font-size: 18px; margin: 8px 0;">Rs. ${product.price}</p>
          ${product.stock > 0 ? '<span style="color: #27ae60; font-size: 12px;">In Stock</span>' : '<span style="color: #e74c3c; font-size: 12px;">Out of Stock</span>'}
        </a>
      </div>
    `).join('');

    // Generate featured products HTML
    const featuredHTML = featured.map(product => `
      <div class="product-card" style="display: inline-block; width: 220px; margin: 10px; vertical-align: top; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; background: white;">
        <a href="${baseUrl}/product/${product.slug || product._id}" style="text-decoration: none; color: inherit;">
          ${product.images && product.images[0] ? `<img src="${baseUrl}/uploads/${product.images[0]}" alt="${product.title}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 6px;" loading="lazy" />` : ''}
          <h3 style="font-size: 14px; margin: 12px 0 8px; height: 40px; overflow: hidden; color: #333;">${product.title}</h3>
          <p style="font-weight: bold; color: #e67e22; font-size: 18px; margin: 8px 0;">Rs. ${product.price}</p>
          ${product.stock > 0 ? '<span style="color: #27ae60; font-size: 12px;">In Stock</span>' : '<span style="color: #e74c3c; font-size: 12px;">Out of Stock</span>'}
        </a>
      </div>
    `).join('');

    // Generate new arrivals HTML
    const newArrivalsHTML = newArrivals.map(product => `
      <div class="product-card" style="display: inline-block; width: 220px; margin: 10px; vertical-align: top; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; background: white;">
        <a href="${baseUrl}/product/${product.slug || product._id}" style="text-decoration: none; color: inherit;">
          ${product.images && product.images[0] ? `<img src="${baseUrl}/uploads/${product.images[0]}" alt="${product.title}" style="width: 100%; height: 220px; object-fit: cover; border-radius: 6px;" loading="lazy" />` : ''}
          <h3 style="font-size: 14px; margin: 12px 0 8px; height: 40px; overflow: hidden; color: #333;">${product.title}</h3>
          <p style="font-weight: bold; color: #e67e22; font-size: 18px; margin: 8px 0;">Rs. ${product.price}</p>
          <span style="background: #3498db; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">NEW</span>
        </a>
      </div>
    `).join('');

    // Generate product list HTML (for backward compatibility)
    const productsHTML = allProducts.slice(0, 20).map(product => `
      <div class="product-item" style="display: inline-block; width: 200px; margin: 10px; vertical-align: top;">
        <a href="${baseUrl}/product/${product.slug || product._id}" style="text-decoration: none; color: inherit;">
          ${product.images && product.images[0] ? `<img src="${baseUrl}/uploads/${product.images[0]}" alt="${product.title}" style="width: 100%; height: 200px; object-fit: cover;" loading="lazy" />` : ''}
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
        ${allProductsForSchema.slice(0, 10).map((product, index) => `{
          "@type": "ListItem",
          "position": ${index + 1},
          "item": {
            "@type": "Product",
            "name": "${product.title.replace(/"/g, '\\"')}",
            "url": "${baseUrl}/product/${product.slug || product._id}",
            "offers": {
              "@type": "Offer",
              "price": "${product.price}",
              "priceCurrency": "PKR",
              "availability": "${product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'}"
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
        <!-- Banners Section -->
        ${banners.length > 0 ? `
        <section style="margin: 30px 0;">
            <h2>Featured Collections</h2>
            ${bannersHTML}
        </section>
        ` : ''}
        
        <!-- Categories Section -->
        <section style="margin: 40px 0;">
            <h2>Shop by Category</h2>
            <div class="categories">
                ${categoriesHTML}
            </div>
        </section>
        
        <!-- Premium Products Section -->
        ${premium.length > 0 ? `
        <section style="margin: 40px 0;">
            <h2>Premium Products</h2>
            <p style="color: #7f8c8d; margin-bottom: 20px;">Discover our hand-picked premium collection</p>
            <div class="products">
                ${premiumHTML}
            </div>
        </section>
        ` : ''}
        
        <!-- Featured Products Section -->
        ${featured.length > 0 ? `
        <section style="margin: 40px 0;">
            <h2>Featured Products</h2>
            <p style="color: #7f8c8d; margin-bottom: 20px;">Best selling products loved by our customers</p>
            <div class="products">
                ${featuredHTML}
            </div>
        </section>
        ` : ''}
        
        <!-- New Arrivals Section -->
        ${newArrivals.length > 0 ? `
        <section style="margin: 40px 0;">
            <h2>New Arrivals</h2>
            <p style="color: #7f8c8d; margin-bottom: 20px;">Check out our latest additions</p>
            <div class="products">
                ${newArrivalsHTML}
            </div>
        </section>
        ` : ''}
        
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

// Helper to generate HTML for products page
const generateProductsPageHTML = async (path) => {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'https://internationaltijarat.com';
    
    // Fetch products with pagination
    const products = await Product.find({ isActive: true, isVisible: true })
      .limit(50)
      .select('title price images category description')
      .lean();

    // Fetch categories for navigation
    const categories = await Category.find({ isActive: true }).limit(20).lean();

    // Generate product list HTML
    const productsHTML = products.map(product => `
      <div class="product-item" style="display: inline-block; width: 200px; margin: 10px; vertical-align: top; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
        <a href="${baseUrl}/product/${product._id}" style="text-decoration: none; color: inherit;">
          ${product.images && product.images[0] ? `<img src="${baseUrl}/uploads/products/${product.images[0]}" alt="${product.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 5px;" loading="lazy" />` : ''}
          <h3 style="font-size: 14px; margin: 10px 0; height: 40px; overflow: hidden;">${product.title}</h3>
          <p style="font-weight: bold; color: #e67e22; font-size: 16px;">Rs. ${product.price}</p>
        </a>
      </div>
    `).join('');

    // Generate categories HTML
    const categoriesHTML = categories.map(cat => `
      <a href="${baseUrl}/category-group/${cat.slug || cat._id}" style="display: inline-block; padding: 10px 15px; margin: 5px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; font-size: 14px;">
        ${cat.name}
      </a>
    `).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Products - International Tijarat | Premium Online Shopping</title>
    <meta name="description" content="Browse all products at International Tijarat. Shop fragrances, jewelry, mobile phones, electronics, and more. Premium quality products with fast delivery across Pakistan.">
    <meta name="keywords" content="online shopping Pakistan, buy products online, fragrances, jewelry, mobile phones, electronics, International Tijarat">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${baseUrl}/products">
    
    <!-- Open Graph -->
    <meta property="og:title" content="All Products - International Tijarat">
    <meta property="og:description" content="Browse our complete collection of premium products. Shop fragrances, jewelry, mobile phones and more.">
    <meta property="og:url" content="${baseUrl}/products">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="International Tijarat">
    
    <!-- Schema.org structured data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "All Products",
      "description": "Browse all products at International Tijarat",
      "url": "${baseUrl}/products",
      "numberOfItems": ${products.length}
    }
    </script>
    
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
        .categories { text-align: center; margin-bottom: 30px; }
        .products { text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>All Products - International Tijarat</h1>
        
        <div class="categories">
            <h2 style="color: #34495e; margin-bottom: 15px;">Shop by Category</h2>
            ${categoriesHTML}
        </div>
        
        <div class="products">
            <h2 style="color: #34495e; margin-bottom: 20px;">Featured Products</h2>
            ${productsHTML}
        </div>
        
        <div style="text-align: center; margin-top: 40px; padding: 20px; background: white; border-radius: 10px;">
            <h3>About International Tijarat</h3>
            <p style="color: #7f8c8d; line-height: 1.6;">
                International Tijarat is Pakistan's premier online shopping destination offering authentic fragrances, 
                luxury jewelry, latest mobile phones, electronics, and much more. We provide fast delivery, 
                secure payment options, and 100% genuine products.
            </p>
        </div>
    </div>
    
    <!-- This script redirects browsers (non-bots) to the React SPA -->
    <script>
        // Only redirect if this is a real browser (not a bot)
        if (!/bot|crawler|spider|crawling/i.test(navigator.userAgent)) {
            window.location.href = '${baseUrl}/products';
        }
    </script>
</body>
</html>`;

    return html;
  } catch (error) {
    console.error('Error generating products page HTML:', error);
    return generateBasicHTML('/products');
  }
};

// Helper to generate basic HTML for any page
const generateBasicHTML = (path) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://internationaltijarat.com';
  const title = path === '/' ? 'International Tijarat' : `${path} - International Tijarat`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="International Tijarat - Premium online shopping for fragrances, jewelry, mobile phones and more">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${baseUrl}${path}">
</head>
<body>
    <h1>International Tijarat</h1>
    <p>Visit our website to browse products: <a href="${baseUrl}${path}">${baseUrl}${path}</a></p>
    
    <!-- This script redirects browsers (non-bots) to the React SPA -->
    <script>
        if (!/bot|crawler|spider|crawling/i.test(navigator.userAgent)) {
            window.location.href = '${baseUrl}${path}';
        }
    </script>
</body>
</html>`;
};

// Export both router and functions
router.generateHomepageHTML = generateHomepageHTML;
router.generateProductsPageHTML = generateProductsPageHTML;
router.generateBasicHTML = generateBasicHTML;
module.exports = router;
