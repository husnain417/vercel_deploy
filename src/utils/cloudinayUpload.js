const { cloudinary } = require('../config/cloudinary');
const fs = require('fs');

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Path to the local file
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise} - Cloudinary upload response
 */
const uploadToCloudinary = async (filePath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: 'auto'
    });
    
    // Delete the local file after upload
    fs.unlinkSync(filePath);
    return result;
  } catch (error) {
    // Delete the local file if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

module.exports = { uploadToCloudinary };