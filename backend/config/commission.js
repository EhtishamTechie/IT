// Commission Configuration
// Centralized commission rates for the entire system

module.exports = {
  // Standard commission rates
  VENDOR_COMMISSION_RATE: 0.20, // 20% commission for vendor orders
  ADMIN_COMMISSION_RATE: 0.20,  // 20% commission for admin handled vendor items
  
  // Commission rate as percentage (for display purposes)
  COMMISSION_PERCENTAGE: 20,
  
  // Helper function to calculate commission
  calculateCommission: (amount) => {
    return amount * module.exports.VENDOR_COMMISSION_RATE;
  },
  
  // Helper function to calculate vendor earnings (after commission)
  calculateVendorEarnings: (amount) => {
    return amount - module.exports.calculateCommission(amount);
  },
  
  // Validation function
  isValidCommissionRate: (rate) => {
    return rate >= 0 && rate <= 1; // Between 0% and 100%
  }
};
