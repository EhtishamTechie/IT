const express = require('express');
const router = express.Router();
const commissionPaymentController = require('../controllers/commissionPaymentController');

// Admin routes for commission payment management
router.post('/generate', commissionPaymentController.generateCommissionPayment);
router.get('/', commissionPaymentController.getCommissionPayments);
router.get('/stats', commissionPaymentController.getCommissionPaymentStats);
router.get('/:id', commissionPaymentController.getCommissionPaymentById);
router.put('/:id/process', commissionPaymentController.processCommissionPayment);
router.put('/:id/status', commissionPaymentController.updatePaymentStatus);

// Vendor routes
router.get('/vendor/:vendorId', commissionPaymentController.getVendorCommissionPayments);

module.exports = router;
