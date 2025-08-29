const express = require('express');
const router = express.Router();

const {
  getVendorInquiries,
  getInquiry,
  createInquiry,
  replyToInquiry,
  updateInquiryStatus,
  assignInquiry,
  addInternalNote,
  getInquiryStats,
  bulkUpdateInquiries
} = require('../controllers/vendorCommunicationController');

const { protectVendor, requireApprovedVendor } = require('../middleware/vendorAuth');

// Public routes (for customer inquiries)
router.post('/inquiries', createInquiry);

// Protected vendor routes
router.use(protectVendor);
router.use(requireApprovedVendor);

// Inquiry management routes
router.route('/inquiries')
  .get(getVendorInquiries);

router.get('/inquiries/stats', getInquiryStats);
router.put('/inquiries/bulk', bulkUpdateInquiries);

router.route('/inquiries/:id')
  .get(getInquiry);

router.post('/inquiries/:id/reply', replyToInquiry);
router.put('/inquiries/:id/status', updateInquiryStatus);
router.put('/inquiries/:id/assign', assignInquiry);
router.post('/inquiries/:id/notes', addInternalNote);

module.exports = router;
