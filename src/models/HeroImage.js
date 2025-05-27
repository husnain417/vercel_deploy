const mongoose = require('mongoose');

const heroImageSchema = new mongoose.Schema({
    pageType: {
        type: String,
        required: true,
        enum: ['home', 'mens', 'womens']
    },
    viewType: {
        type: String,
        required: true,
        enum: ['web', 'mobile']
    },
    imageUrl: {
        type: String,
        required: true
    },
    cloudinaryId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Compound index to ensure unique combination of pageType and viewType
heroImageSchema.index({ pageType: 1, viewType: 1 }, { unique: true });

const HeroImage = mongoose.model('HeroImage', heroImageSchema);

module.exports = HeroImage; 