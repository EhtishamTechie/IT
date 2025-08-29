const express = require('express');
const router = express.Router();
const HomepageBanner = require('../models/HomepageBanner');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const { uploadBannerImage } = require('../middleware/uploadMiddleware');

// Get all banner slides
router.get('/', async (req, res) => {
    try {
        const banner = await HomepageBanner.findOne();
        const slides = banner ? banner.slides.sort((a, b) => a.order - b.order) : [];
        res.json(slides);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update banner slides (admin only)
router.put('/', [authenticateAdmin, uploadBannerImage], async (req, res) => {
    try {
        const { slides } = req.body;
        
        if (!slides || !Array.isArray(slides)) {
            return res.status(400).json({ message: 'Slides array is required' });
        }

        // Handle file uploads if any
        if (req.files) {
            for (const slide of slides) {
                if (req.files[slide.image]) {
                    slide.image = req.files[slide.image].filename;
                }
            }
        }

        let banner = await HomepageBanner.findOne();
        if (!banner) {
            banner = new HomepageBanner();
        }

        banner.slides = slides.map((slide, index) => ({
            ...slide,
            order: index
        }));

        await banner.save();
        res.json(banner.slides);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
