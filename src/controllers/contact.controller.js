// controllers/contactController.js
const emailService = require('../utils/emailService');

/**
 * Handle contact form submissions
 * @param {Object} req - Express request object with name, email, and message
 * @param {Object} res - Express response object
 */
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide name, email, and message' 
      });
    }

    // Validate email format (simple validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid email address' 
      });
    }

    // Send notification email using emailService
    await emailService.sendContactFormEmail(name, email, message);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Your message has been sent. We will get back to you soon!'
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    return res.status(500).json({
      success: false,
      error: 'There was a problem sending your message. Please try again later.'
    });
  }
};