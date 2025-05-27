// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');

/**
 * @route   POST /api/contact
 * @desc    Submit contact form
 * @access  Public
 */
router.post('/', contactController.submitContactForm);

module.exports = router;