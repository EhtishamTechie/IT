/**
 * Image Optimization Utilities
 * Generates responsive image srcsets and optimizes image loading
 */

/**
 * Generate srcset for responsive images
 * @param {string} imagePath - Original image path
 * @param {array} widths - Array of widths to generate
 * @returns {string} srcset string
 */
export const generateSrcSet = (imagePath, widths = [320, 640, 960, 1280, 1920]) => {
  if (!imagePath) return '';
  
  // For external URLs or data URIs, return as-is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return '';
  }
  
  // Generate srcset with different widths
  return widths
    .map(width => `${imagePath}?w=${width} ${width}w`)
    .join(', ');
};

/**
 * Generate sizes attribute for responsive images
 * @param {string} type - Image type (hero, card, thumbnail, etc.)
 * @returns {string} sizes string
 */
export const generateSizes = (type = 'default') => {
  const sizesMap = {
    hero: '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px',
    card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px',
    thumbnail: '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px',
    product: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px',
    default: '100vw'
  };
  
  return sizesMap[type] || sizesMap.default;
};

/**
 * Check if image should be eagerly loaded (above the fold)
 * @param {number} index - Image index in list
 * @param {number} threshold - Number of images to load eagerly
 * @returns {boolean}
 */
export const shouldEagerLoad = (index, threshold = 2) => {
  return index < threshold;
};

/**
 * Get fetchpriority attribute value
 * @param {number} index - Image index
 * @param {boolean} isLCP - Is this the LCP element
 * @returns {string} 'high', 'low', or 'auto'
 */
export const getFetchPriority = (index, isLCP = false) => {
  if (isLCP) return 'high';
  if (index === 0) return 'high';
  if (index < 2) return 'auto';
  return 'low';
};

/**
 * Preload critical images
 * @param {string} imagePath - Image to preload
 * @param {object} options - Preload options
 */
export const preloadImage = (imagePath, options = {}) => {
  const {
    as = 'image',
    type = 'image/jpeg',
    fetchPriority = 'high',
    sizes,
    srcset
  } = options;
  
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = as;
  link.href = imagePath;
  link.type = type;
  if (fetchPriority) link.fetchPriority = fetchPriority;
  if (sizes) link.setAttribute('imagesizes', sizes);
  if (srcset) link.setAttribute('imagesrcset', srcset);
  
  document.head.appendChild(link);
};

/**
 * Get optimal image format based on browser support
 * @returns {string} Preferred image format
 */
export const getPreferredImageFormat = () => {
  if (typeof window === 'undefined') return 'jpeg';
  
  // Check for WebP support
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    if (supportsWebP) return 'webp';
  }
  
  return 'jpeg';
};

/**
 * Add lazy loading intersection observer
 * @param {HTMLElement} target - Element to observe
 * @param {function} callback - Callback when element is visible
 * @param {object} options - Intersection observer options
 */
export const observeLazyLoad = (target, callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px', // Load 50px before entering viewport
    threshold: 0.01
  };
  
  const observerOptions = { ...defaultOptions, ...options };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  observer.observe(target);
  
  return observer;
};

export default {
  generateSrcSet,
  generateSizes,
  shouldEagerLoad,
  getFetchPriority,
  preloadImage,
  getPreferredImageFormat,
  observeLazyLoad
};
