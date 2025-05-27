const mongoose = require('mongoose');

const colorTileSchema = new mongoose.Schema({
    colorName: {
        type: String,
        required: true,
        unique: true
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

const ColorTile = mongoose.model('ColorTile', colorTileSchema);

module.exports = ColorTile; 