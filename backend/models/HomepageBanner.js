const mongoose = require('mongoose');

const slideSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    primaryProduct: {
        type: mongoose.Schema.Types.Mixed
    },
    secondaryProducts: [{
        type: mongoose.Schema.Types.Mixed
    }],
    image: {
        type: String,
        required: false  // Made optional since we get image from primaryProduct
    },
    order: {
        type: Number,
        default: 0
    }
});

const homepageBannerSchema = new mongoose.Schema({
    slides: [slideSchema],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('HomepageBanner', homepageBannerSchema);
