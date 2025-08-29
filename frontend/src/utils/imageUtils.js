import config from '../config';

/**
 * Gets the complete URL for a vendor logo
 * @param {string} logoPath - The relative path or filename of the logo
 * @returns {string|null} The complete URL or null if no logo
 */
export const getVendorLogoUrl = (logoPath) => {
  if (!logoPath) return null;
  
  // If already a full URL, return as is
  if (logoPath.startsWith('http')) return logoPath;
  
  const baseUrl = config.UPLOADS_URL || config.API_BASE_URL;
  
  // Handle both full paths and filenames
  if (logoPath.startsWith('/uploads/')) {
    return `${baseUrl}${logoPath}`;
  }
  
  return `${baseUrl}/uploads/vendor-logos/${logoPath}`;
};

/**
 * Handles image loading errors by setting a fallback
 * @param {Event} event - The error event from img onError
 */
export const handleImageError = (event) => {
  console.log('🖼️ Image load failed, using fallback');
  event.target.src = '/placeholder-image.jpg';
};
