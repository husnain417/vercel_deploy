const ColorTile = require('../models/ColorTile');
const { cloudinary } = require('../config/cloudinary');
const fs = require('fs').promises;

// Helper function to clean up temporary files
const cleanupTempFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error('Error cleaning up temporary file:', error);
    }
};

// Get all color tiles
exports.getAllColorTiles = async (req, res) => {
    try {
        const colorTiles = await ColorTile.find().sort({ colorName: 1 });
        res.status(200).json({
            success: true,
            data: colorTiles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching color tiles'
        });
    }
};

// Upload color tile
exports.uploadColorTile = async (req, res) => {
    try {
        const { colorName } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ 
                success: false,
                message: 'No file uploaded' 
            });
        }

        if (!colorName) {
            return res.status(400).json({
                success: false,
                message: 'Color name is required'
            });
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
            folder: 'color-tiles',
        });

        // Clean up temporary file
        await cleanupTempFile(file.path);

        // Create new color tile
        const colorTile = await ColorTile.create({
            colorName,
            imageUrl: result.secure_url,
            cloudinaryId: result.public_id
        });

        res.status(200).json({
            success: true,
            data: colorTile
        });
    } catch (error) {
        // Clean up temporary file in case of error
        if (req.file) {
            await cleanupTempFile(req.file.path);
        }
        
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading color tile'
        });
    }
};

// Delete color tile
exports.deleteColorTile = async (req, res) => {
    try {
        const { colorName } = req.params;
        
        const colorTile = await ColorTile.findOne({ colorName });
        if (!colorTile) {
            return res.status(404).json({
                success: false,
                message: 'Color tile not found'
            });
        }

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(colorTile.cloudinaryId);

        // Delete from database
        await colorTile.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Color tile deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error deleting color tile'
        });
    }
}; 