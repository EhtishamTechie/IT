const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// Cart routes - require authentication
router.use(authenticateToken);

// GET /api/cart - Get user's cart
router.get('/', cartController.getCart);

// POST /api/cart/add - Add item to cart
router.post('/add', cartController.addToCart);

// PUT /api/cart/update - Update item quantity
router.put('/update', cartController.updateCartItem);

// DELETE /api/cart/remove/:productId - Remove item from cart
router.delete('/remove/:productId', cartController.removeFromCart);

// DELETE /api/cart/clear - Clear entire cart
router.delete('/clear', cartController.clearCart);

module.exports = router;
