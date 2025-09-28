// Schema.org Structured Data Templates for International Tijarat

// Organization Schema
export const getOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "International Tijarat",
  "description": "Premium E-commerce Marketplace offering quality products with secure payment and fast delivery",
  "url": "https://internationaltijarat.com",
  "logo": "https://internationaltijarat.com/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+92-XXX-XXXXXXX",
    "contactType": "customer service",
    "availableLanguage": ["English", "Urdu"]
  },
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "PK"
  },
  "sameAs": [
    "https://facebook.com/internationaltijarat", 
    "https://twitter.com/internationaltijarat",
    "https://instagram.com/internationaltijarat"
  ]
});

// Website Schema with Search Action
export const getWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "International Tijarat",
  "url": "https://internationaltijarat.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://internationaltijarat.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
});

// Product Schema
export const getProductSchema = (product) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title || product.name,
    "description": product.description,
    "sku": product._id || product.id,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "International Tijarat"
    },
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": product.currency || "PKR",
      "availability": product.inStock 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "International Tijarat"
      }
    }
  };

  // Add images if available
  if (product.image || product.images) {
    const images = product.images || [product.image];
    schema.image = images.filter(Boolean);
  }

  // Add category if available
  if (product.category || product.mainCategory) {
    schema.category = product.category || product.mainCategory;
  }

  // Add ratings if available
  if (product.rating && product.rating.average && product.rating.count) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": product.rating.average,
      "reviewCount": product.rating.count
    };
  }

  return schema;
};

// Breadcrumb Schema
export const getBreadcrumbSchema = (breadcrumbs) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": breadcrumbs.map((crumb, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": crumb.name,
    "item": crumb.url
  }))
});

// Collection Page Schema (for product listings)
export const getCollectionSchema = (title, description, itemCount) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": title,
  "description": description,
  "numberOfItems": itemCount,
  "url": window.location.href
});

// FAQ Schema
export const getFAQSchema = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

// Article Schema (for blog posts)
export const getArticleSchema = (article) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": article.title,
  "description": article.description,
  "image": article.image,
  "author": {
    "@type": "Organization",
    "name": "International Tijarat"
  },
  "publisher": {
    "@type": "Organization",
    "name": "International Tijarat",
    "logo": {
      "@type": "ImageObject",
      "url": "https://internationaltijarat.com/logo.png"
    }
  },
  "datePublished": article.publishedDate,
  "dateModified": article.modifiedDate || article.publishedDate
});

// Local Business Schema (if you have physical stores)
export const getLocalBusinessSchema = (business) => ({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": business.name || "International Tijarat",
  "description": business.description,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": business.address?.street,
    "addressLocality": business.address?.city,
    "addressRegion": business.address?.state,
    "postalCode": business.address?.zipCode,
    "addressCountry": "PK"
  },
  "telephone": business.phone,
  "openingHours": business.hours || "Mo-Su 09:00-21:00"
});

// Category Page Schema with Product List
export const getCategorySchema = (categoryName, products = [], siteUrl = 'https://internationaltijarat.com') => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": `${categoryName} Products`,
  "description": `Shop premium ${categoryName.toLowerCase()} products with fast delivery and competitive prices.`,
  "url": `${siteUrl}/category/${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  "mainEntity": {
    "@type": "ItemList",
    "name": `${categoryName} Products`,
    "numberOfItems": products.length,
    "itemListElement": products.slice(0, 20).map((product, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Product",
        "name": product.name || product.title,
        "description": product.description || `Quality ${categoryName.toLowerCase()} product`,
        "image": product.image || '',
        "url": `${siteUrl}/product/${product.slug || product._id}`,
        "offers": {
          "@type": "Offer",
          "price": product.price || "0",
          "priceCurrency": "PKR",
          "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
      }
    }))
  },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": categoryName,
        "item": `${siteUrl}/category/${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      }
    ]
  }
});

// Alias for compatibility
export const generateBreadcrumbSchema = getBreadcrumbSchema;
export const generateProductSchema = getProductSchema;

// Export all schemas
export default {
  getOrganizationSchema,
  getWebsiteSchema,
  getProductSchema,
  getBreadcrumbSchema,
  getCollectionSchema,
  getCategorySchema,
  getFAQSchema,
  getArticleSchema,
  getLocalBusinessSchema
};