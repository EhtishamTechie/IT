// WhatsApp utilities for backend validation

/**
 * Validates WhatsApp number format
 * Accepts formats like: +923001234567, 923001234567, 03001234567
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
const validateWhatsAppNumber = (phone) => {
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
 * Formats phone number for storage and display
 * @param {string} phone - Phone number to format
 * @returns {string} - Formatted phone number
 */
const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all spaces and special characters except +
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Handle different input formats
  if (cleanPhone.startsWith('0')) {
    // Convert 03001234567 to +923001234567
    cleanPhone = '+92' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('92') && !cleanPhone.startsWith('+92')) {
    // Convert 923001234567 to +923001234567
    cleanPhone = '+' + cleanPhone;
  } else if (!cleanPhone.startsWith('+')) {
    // Handle international numbers without + prefix
    if (cleanPhone.length >= 10) {
      cleanPhone = '+' + cleanPhone;
    }
  }
  
  return cleanPhone;
};

module.exports = {
  validateWhatsAppNumber,
  formatWhatsAppNumber
};
