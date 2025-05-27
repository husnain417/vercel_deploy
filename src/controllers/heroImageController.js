const HeroImage = require('../models/HeroImage');
const { cloudinary } = require('../config/cloudinary');
const fs = require('fs').promises;
const path = require('path');

// Helper function to clean up temporary files
const cleanupTempFile = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (error) {
        console.error('Error cleaning up temporary file:', error);
    }
};

// Upload single image
exports.uploadImage = async (req, res) => {
    try {
        const { pageType, viewType } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ 
                success: false,
                message: 'No file uploaded' 
            });
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
            folder: `hero-images/${pageType}`,
        });

        // Clean up temporary file
        await cleanupTempFile(file.path);

        // Create or update the image record
        const heroImage = await HeroImage.findOneAndUpdate(
            { pageType, viewType },
            {
                imageUrl: result.secure_url,
                cloudinaryId: result.public_id
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            data: heroImage
        });
    } catch (error) {
        // Clean up temporary file in case of error
        if (req.file) {
            await cleanupTempFile(req.file.path);
        }
        
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading image'
        });
    }
};

// Upload both web and mobile images for a page
exports.uploadPageImages = async (req, res) => {
    try {
        const { pageType } = req.params;
        const files = req.files;

        if (!files || !files.webImage || !files.mobileImage) {
            return res.status(400).json({ 
                success: false,
                message: 'Both web and mobile images are required' 
            });
        }

        // Upload web image
        const webResult = await cloudinary.uploader.upload(files.webImage[0].path, {
            folder: `hero-images/${pageType}`,
        });

        // Upload mobile image
        const mobileResult = await cloudinary.uploader.upload(files.mobileImage[0].path, {
            folder: `hero-images/${pageType}`,
        });

        // Clean up temporary files
        await Promise.all([
            cleanupTempFile(files.webImage[0].path),
            cleanupTempFile(files.mobileImage[0].path)
        ]);

        // Update or create both images
        const [webHeroImage, mobileHeroImage] = await Promise.all([
            HeroImage.findOneAndUpdate(
                { pageType, viewType: 'web' },
                {
                    imageUrl: webResult.secure_url,
                    cloudinaryId: webResult.public_id
                },
                { upsert: true, new: true }
            ),
            HeroImage.findOneAndUpdate(
                { pageType, viewType: 'mobile' },
                {
                    imageUrl: mobileResult.secure_url,
                    cloudinaryId: mobileResult.public_id
                },
                { upsert: true, new: true }
            )
        ]);

        res.status(200).json({
            success: true,
            data: {
                web: webHeroImage,
                mobile: mobileHeroImage
            }
        });
    } catch (error) {
        // Clean up temporary files in case of error
        if (req.files) {
            const cleanupPromises = [];
            if (req.files.webImage) cleanupPromises.push(cleanupTempFile(req.files.webImage[0].path));
            if (req.files.mobileImage) cleanupPromises.push(cleanupTempFile(req.files.mobileImage[0].path));
            await Promise.all(cleanupPromises);
        }

        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading images'
        });
    }
};

// Get Home Page Images
exports.getHomePageImages = async (req, res) => {
    try {
        const images = await HeroImage.find({ pageType: 'home' });
        const formattedResponse = {
            web: images.find(img => img.viewType === 'web'),
            mobile: images.find(img => img.viewType === 'mobile')
        };
        
        res.status(200).json({
            success: true,
            data: formattedResponse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching home page images'
        });
    }
};

// Get Mens Page Images
exports.getMensPageImages = async (req, res) => {
    try {
        const images = await HeroImage.find({ pageType: 'mens' });
        const formattedResponse = {
            web: images.find(img => img.viewType === 'web'),
            mobile: images.find(img => img.viewType === 'mobile')
        };
        
        res.status(200).json({
            success: true,
            data: formattedResponse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching mens page images'
        });
    }
};

// Get Womens Page Images
exports.getWomensPageImages = async (req, res) => {
    try {
        const images = await HeroImage.find({ pageType: 'womens' });
        const formattedResponse = {
            web: images.find(img => img.viewType === 'web'),
            mobile: images.find(img => img.viewType === 'mobile')
        };
        
        res.status(200).json({
            success: true,
            data: formattedResponse
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching womens page images'
        });
    }
};

// Get all images
exports.getAllImages = async (req, res) => {
    try {
        const images = await HeroImage.find();
        res.status(200).json({
            success: true,
            data: images
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching all images'
        });
    }
};

// Get images by page type
exports.getImagesByPage = async (req, res) => {
    try {
        const { pageType } = req.params;
        const images = await HeroImage.find({ pageType });
        res.status(200).json({
            success: true,
            data: images
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error fetching page images'
        });
    }
};

// Delete image
exports.deleteImage = async (req, res) => {
    try {
        const { pageType, viewType } = req.params;
        
        const image = await HeroImage.findOne({ pageType, viewType });
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(image.cloudinaryId);

        // Delete from database
        await image.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Image deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Error deleting image'
        });
    }
}; 