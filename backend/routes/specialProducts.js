const express = require('express');
const router = express.Router();
const FeaturedProducts = require('../models/FeaturedProducts');
const PremiumProducts = require('../models/PremiumProducts');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Get all featured products
router.get('/featured', async (req, res) => {
    try {
        const featuredProducts = await FeaturedProducts.findOne()
            .populate('products');
        res.json(featuredProducts ? featuredProducts.products : []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all premium products
router.get('/premium', async (req, res) => {
    try {
        const premiumProducts = await PremiumProducts.findOne()
            .populate('products');
        res.json(premiumProducts ? premiumProducts.products : []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update featured products (admin only)
router.put('/featured', [auth, admin], async (req, res) => {
    try {
        const { productIds } = req.body;
        let featuredProducts = await FeaturedProducts.findOne();
        
        if (!featuredProducts) {
            featuredProducts = new FeaturedProducts();
        }
        
        featuredProducts.products = productIds;
        featuredProducts.lastUpdated = Date.now();
        await featuredProducts.save();
        
        const updatedProducts = await FeaturedProducts.findOne()
            .populate('products');
        
        res.json(updatedProducts.products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update premium products (admin only)
router.put('/premium', [auth, admin], async (req, res) => {
    try {
        const { productIds } = req.body;
        let premiumProducts = await PremiumProducts.findOne();
        
        if (!premiumProducts) {
            premiumProducts = new PremiumProducts();
        }
        
        premiumProducts.products = productIds;
        premiumProducts.lastUpdated = Date.now();
        await premiumProducts.save();
        
        const updatedProducts = await PremiumProducts.findOne()
            .populate('products');
        
        res.json(updatedProducts.products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get products by category for selection
router.get('/category/:categoryId', async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.categoryId });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
