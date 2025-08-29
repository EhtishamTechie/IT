const logger = require('../utils/logger');

// Input validation and sanitization middleware
const validateInput = {
  // Sanitize string input
  sanitizeString: (str, maxLength = 1000) => {
    if (typeof str !== 'string') return '';
    return str
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, ''); // Remove potential XSS characters
  },

  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate MongoDB ObjectId
  isValidObjectId: (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  },

  // General input validation middleware
  validateRequest: (validationRules) => {
    return (req, res, next) => {
      const errors = [];

      for (const [field, rules] of Object.entries(validationRules)) {
        const value = req.body[field];

        // Check required fields
        if (rules.required && (!value || value.toString().trim() === '')) {
          errors.push(`${field} is required`);
          continue;
        }

        if (value) {
          // Check string length
          if (rules.maxLength && value.toString().length > rules.maxLength) {
            errors.push(`${field} must not exceed ${rules.maxLength} characters`);
          }

          if (rules.minLength && value.toString().length < rules.minLength) {
            errors.push(`${field} must be at least ${rules.minLength} characters`);
          }

          // Check email format
          if (rules.isEmail && !validateInput.isValidEmail(value)) {
            errors.push(`${field} must be a valid email address`);
          }

          // Check ObjectId format
          if (rules.isObjectId && !validateInput.isValidObjectId(value)) {
            errors.push(`${field} must be a valid ID`);
          }

          // Check numeric values
          if (rules.isNumeric && isNaN(Number(value))) {
            errors.push(`${field} must be a number`);
          }

          // Check minimum value
          if (rules.min && Number(value) < rules.min) {
            errors.push(`${field} must be at least ${rules.min}`);
          }

          // Check maximum value
          if (rules.max && Number(value) > rules.max) {
            errors.push(`${field} must not exceed ${rules.max}`);
          }

          // Sanitize string input
          if (rules.sanitize) {
            req.body[field] = validateInput.sanitizeString(value, rules.maxLength);
          }
        }
      }

      if (errors.length > 0) {
        logger.warn('Input validation failed:', errors);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      next();
    };
  }
};

module.exports = validateInput;
