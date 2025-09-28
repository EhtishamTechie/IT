// SEO Configuration and Utilities for International Tijarat
// This file contains all SEO-related constants and helper functions

// Get site URL using the same pattern as the main config
const getSiteUrl = () => {
  const url = import.meta.env.VITE_SITE_URL || 
              import.meta.env.VITE_BASE_URL || 
              (import.meta.env.DEV ? 'http://localhost:3000' : 'https://internationaltijarat.com');
              
  return url.replace(/\/+$/, ''); // Remove trailing slashes
};

export const SEO_CONFIG = {
  // Site Information
  SITE_NAME: 'International Tijarat',
  SITE_URL: getSiteUrl(),
  SITE_DESCRIPTION: 'Shop premium products on International Tijarat - Pakistan\'s leading e-commerce platform. Find electronics, fashion, home goods, and more with secure payment and fast delivery.',
  
  // Default Meta Tags
  DEFAULT_META: {
    TITLE: 'International Tijarat - Premium E-commerce Marketplace | Global Trade Platform',
    DESCRIPTION: 'Shop premium products on International Tijarat - Pakistan\'s leading e-commerce platform. Find electronics, fashion, home goods, and more with secure payment and fast delivery.',
    KEYWORDS: 'International Tijarat, Pakistan ecommerce, online shopping, premium products, global marketplace, electronics, fashion, home goods',
    IMAGE: '/og-image.jpg',
    TWITTER_CARD: 'summary_large_image'
  },
  
  // SEO Best Practices
  TITLE_MAX_LENGTH: 60,
  DESCRIPTION_MAX_LENGTH: 160,
  KEYWORDS_MAX_COUNT: 10,
  
  // URL Structure
  URL_PATTERNS: {
    PRODUCT: '/product/:slug',
    CATEGORY: '/category/:slug', 
    SEARCH: '/search'
  }
};

// Generate SEO-friendly slugs
export const generateSlug = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
};

// Generate keywords from product data
export const generateKeywords = (type, data = {}) => {
  const baseKeywords = 'International Tijarat, Pakistan ecommerce, online shopping, premium products';
  
  switch (type) {
    case 'product':
      return `${data.name}, ${data.category}, ${baseKeywords}, buy online`;
    case 'category':
      return `${data.category} products, ${baseKeywords}, ${data.category} online shopping`;
    case 'home':
      return `${baseKeywords}, global marketplace, electronics, fashion, home goods`;
    default:
      return baseKeywords;
  }
};

// Generate canonical URLs
export const getCanonicalUrl = (path) => {
  const baseUrl = SEO_CONFIG.SITE_URL;
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

// Generate breadcrumbs
export const generateBreadcrumbs = (pathname, params = {}) => {
  const breadcrumbs = [
    { name: 'Home', url: '/' }
  ];

  const pathSegments = pathname.split('/').filter(Boolean);
  
  pathSegments.forEach((segment, index) => {
    const isLast = index === pathSegments.length - 1;
    let name = segment;
    let url = '/' + pathSegments.slice(0, index + 1).join('/');

    // Customize names based on route patterns
    switch (segment) {
      case 'products':
        name = 'All Products';
        break;
      case 'category':
        name = params.categoryName ? decodeURIComponent(params.categoryName) : 'Category';
        break;
      case 'product':
        name = params.productName ? decodeURIComponent(params.productName) : 'Product';
        break;
      default:
        name = segment.charAt(0).toUpperCase() + segment.slice(1);
    }

    if (!isLast || breadcrumbs.length === 1) {
      breadcrumbs.push({ name, url });
    }
  });

  return breadcrumbs;
};

// Validate slug uniqueness
export const validateSlug = async (slug, type, excludeId = null) => {
  // This will be implemented when we add API endpoints
  // For now, return true
  return true;
};

// SEO optimization utilities
export const optimizeSEOContent = {
  // Optimize title for SEO
  optimizeTitle: (title, siteName = SEO_CONFIG.SITE_NAME) => {
    if (!title) return SEO_CONFIG.DEFAULT_META.TITLE;
    
    const maxLength = SEO_CONFIG.TITLE_MAX_LENGTH - siteName.length - 3; // Account for " | "
    const truncatedTitle = title.length > maxLength 
      ? title.substring(0, maxLength).trim() + '...'
      : title;
    
    return `${truncatedTitle} | ${siteName}`;
  },
  
  // Optimize description for SEO
  optimizeDescription: (description) => {
    if (!description) return SEO_CONFIG.DEFAULT_META.DESCRIPTION;
    
    return description.length > SEO_CONFIG.DESCRIPTION_MAX_LENGTH
      ? description.substring(0, SEO_CONFIG.DESCRIPTION_MAX_LENGTH - 3).trim() + '...'
      : description;
  },
  
  // Generate alt text for images
  generateAltText: (productName, context = '') => {
    const baseAlt = productName || 'Product image';
    return context 
      ? `${baseAlt} - ${context} - International Tijarat`
      : `${baseAlt} - Buy online at International Tijarat`;
  }
};

// Generate comprehensive SEO data for category pages
export const generateCategorySEO = (categoryName, products = [], groupName = null) => {
  const productCount = products.length;
  const categorySlug = groupName || categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  return {
    title: `${categoryName} Products - Shop Quality ${categoryName} | ${SEO_CONFIG.SITE_NAME}`,
    description: `Discover ${productCount > 0 ? `${productCount} premium` : 'premium'} ${categoryName.toLowerCase()} products at ${SEO_CONFIG.SITE_NAME}. Fast delivery, competitive prices, and quality guaranteed.`,
    keywords: [
      categoryName.toLowerCase(),
      `${categoryName.toLowerCase()} products`,
      `buy ${categoryName.toLowerCase()}`,
      `${categoryName.toLowerCase()} online`,
      `${categoryName.toLowerCase()} shopping`,
      `best ${categoryName.toLowerCase()}`,
      ...SEO_CONFIG.DEFAULT_META.KEYWORDS
    ],
    canonicalUrl: getCanonicalUrl(`/category/${categorySlug}`),
    openGraph: {
      title: `${categoryName} Products | ${SEO_CONFIG.SITE_NAME}`,
      description: `Shop premium ${categoryName.toLowerCase()} products with fast delivery and best prices.`,
      type: 'website',
      url: getCanonicalUrl(`/category/${categorySlug}`),
      images: products.length > 0 && products[0].image ? [
        {
          url: products[0].image,
          width: 1200,
          height: 630,
          alt: `${categoryName} Products`
        }
      ] : []
    },
    twitter: {
      title: `${categoryName} Products | ${SEO_CONFIG.SITE_NAME}`,
      description: `Shop premium ${categoryName.toLowerCase()} products with fast delivery and best prices.`,
      images: products.length > 0 && products[0].image ? [products[0].image] : []
    }
  };
};

// Generate Product SEO data
export const generateProductSEO = (product) => {
  if (!product) return {};
  
  const title = product.metaTitle || `${product.title || product.name} - Buy Online | ${SEO_CONFIG.SITE_NAME}`;
  const description = product.metaDescription || 
    (product.description ? 
      `${product.description.replace(/<[^>]*>/g, '').substring(0, 150)}... Shop now at ${SEO_CONFIG.SITE_NAME}` :
      `Premium ${product.title || product.name} available at ${SEO_CONFIG.SITE_NAME}. Quality guaranteed with fast delivery.`
    );

  return {
    title,
    description,
    keywords: product.seoKeywords || generateKeywords('product', product),
    openGraph: {
      title,
      description,
      type: 'product',
      images: product.images ? product.images.map(img => ({
        url: img,
        alt: product.altText || `${product.title || product.name} - Product Image`
      })) : []
    },
    twitter: {
      title,
      description,
      images: product.images || []
    },
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.title || product.name,
      "description": product.description,
      "image": product.images || [],
      "brand": {
        "@type": "Brand",
        "name": SEO_CONFIG.SITE_NAME
      }
    }
  };
};

// Generate canonical URL
export const generateCanonicalUrl = (path) => {
  const baseUrl = SEO_CONFIG.SITE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

export default SEO_CONFIG;