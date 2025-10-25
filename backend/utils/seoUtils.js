// Backend SEO Utilities for International Tijarat
// Generate SEO-friendly slugs and handle SEO-related operations

// Generate slug from text
const generateSlug = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens  
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length for database efficiency
};

// Generate unique slug by checking database
const generateUniqueSlug = async (text, Model, excludeId = null) => {
  let baseSlug = generateSlug(text);
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const query = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const existing = await Model.findOne(query);
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

// Extract keywords from text
const extractKeywords = (text, maxKeywords = 10) => {
  if (!text) return [];
  
  // Common stop words to filter out
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, maxKeywords);
};

// Generate meta description from content
const generateMetaDescription = (content, maxLength = 160) => {
  if (!content) return '';
  
  // Remove HTML tags and extra whitespace
  const cleanContent = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }
  
  // Find the last complete sentence within the limit
  const truncated = cleanContent.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastPeriod > maxLength - 50) {
    return truncated.substring(0, lastPeriod + 1);
  } else if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  } else {
    return truncated + '...';
  }
};

// Generate alt text for images
const generateAltText = (productName, imageIndex = 0) => {
  const baseName = productName || 'Product image';
  const suffix = imageIndex > 0 ? ` - Image ${imageIndex + 1}` : '';
  return `${baseName}${suffix} - Buy online at International Tijarat`;
};

// SEO validation functions
const validateSEOData = {
  title: (title) => {
    if (!title) return { valid: false, message: 'Title is required' };
    if (title.length < 10) return { valid: false, message: 'Title too short (minimum 10 characters)' };
    if (title.length > 60) return { valid: false, message: 'Title too long (maximum 60 characters)' };
    return { valid: true };
  },
  
  description: (description) => {
    if (!description) return { valid: false, message: 'Description is required' };
    if (description.length < 50) return { valid: false, message: 'Description too short (minimum 50 characters)' };
    if (description.length > 160) return { valid: false, message: 'Description too long (maximum 160 characters)' };
    return { valid: true };
  },
  
  slug: (slug) => {
    if (!slug) return { valid: false, message: 'Slug is required' };
    if (!/^[a-z0-9-]+$/.test(slug)) return { valid: false, message: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    if (slug.length < 3) return { valid: false, message: 'Slug too short (minimum 3 characters)' };
    if (slug.length > 100) return { valid: false, message: 'Slug too long (maximum 100 characters)' };
    return { valid: true };
  }
};

// Generate sitemap data for products/categories
const generateSitemapEntry = (item, type = 'product') => {
  const baseUrl = process.env.FRONTEND_URL || 'https://internationaltijarat.com';
  
  // Use correct URL patterns matching your actual routes
  let path;
  if (type === 'product') {
    path = `/product/${item.slug}`;
  } else if (type === 'category') {
    path = `/category/${item.slug}`;
  } else if (type === 'category-group') {
    path = `/category-group/${item.slug}`;
  } else {
    path = `/${item.slug}`;
  }
  
  return {
    loc: `${baseUrl}${path}`,
    lastmod: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
    changefreq: type === 'product' ? 'weekly' : 'monthly',
    priority: type === 'product' ? '0.8' : '0.7',
    images: item.images || []
  };
};

module.exports = {
  generateSlug,
  generateUniqueSlug,
  extractKeywords,
  generateMetaDescription,
  generateAltText,
  validateSEOData,
  generateSitemapEntry
};