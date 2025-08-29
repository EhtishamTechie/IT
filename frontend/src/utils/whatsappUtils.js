// WhatsApp utilities for used products marketplace

/**
 * Validates WhatsApp number format
 * Accepts formats like: +923001234567, 923001234567, 03001234567
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
export const validateWhatsAppNumber = (phone) => {
  if (!phone) return false;
  
  // Remove all spaces and special characters except +
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check various valid formats
  const patterns = [
    /^\+92[0-9]{10}$/,    // +923001234567 (Pakistan)
    /^92[0-9]{10}$/,      // 923001234567
    /^0[0-9]{10}$/,       // 03001234567
    /^\+[1-9][0-9]{10,14}$/ // International format +country_code_number
  ];
  
  return patterns.some(pattern => pattern.test(cleanPhone));
};

/**
 * Formats phone number for WhatsApp URL
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number for WhatsApp
 */
export const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all spaces and special characters except +
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Handle different input formats
  if (cleanPhone.startsWith('0')) {
    // Convert 03001234567 to 923001234567
    cleanPhone = '92' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('+92')) {
    // Remove + from +923001234567
    cleanPhone = cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('92') && !cleanPhone.startsWith('+')) {
    // Handle international numbers without country code
    // Assume Pakistan if no country code (you can modify this logic)
    if (cleanPhone.length === 10) {
      cleanPhone = '92' + cleanPhone;
    }
  } else if (cleanPhone.startsWith('+')) {
    // Remove + from international numbers
    cleanPhone = cleanPhone.substring(1);
  }
  
  return cleanPhone;
};

/**
 * Creates WhatsApp chat URL
 * @param {string} phone - Phone number
 * @param {string} productTitle - Product title for pre-filled message
 * @param {string} productPrice - Product price
 * @returns {string} - WhatsApp URL
 */
export const createWhatsAppURL = (phone, productTitle = '', productPrice = '') => {
  const formattedPhone = formatWhatsAppNumber(phone);
  
  if (!formattedPhone) return '#';
  
  // Create pre-filled message with International Tijarat branding
  const message = productTitle 
    ? `Hi! I found your "${productTitle}" listed for ${productPrice} on International Tijarat. Is it still available?`
    : 'Hi! I\'m interested in your product listed on International Tijarat. Is it still available?';
  
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

/**
 * Gets WhatsApp number display format
 * @param {string} phone - Phone number
 * @returns {string} - Display formatted phone number
 */
export const getWhatsAppDisplayNumber = (phone) => {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Format for display
  if (cleanPhone.startsWith('+92')) {
    return cleanPhone.replace(/(\+92)(\d{3})(\d{7})/, '$1 $2 $3');
  } else if (cleanPhone.startsWith('92')) {
    return '+' + cleanPhone.replace(/(\d{2})(\d{3})(\d{7})/, '$1 $2 $3');
  } else if (cleanPhone.startsWith('0')) {
    return cleanPhone.replace(/(\d{4})(\d{7})/, '$1 $2');
  }
  
  return phone; // Return original if format not recognized
};
