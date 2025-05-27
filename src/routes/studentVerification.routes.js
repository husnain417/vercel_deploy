// studentVerification.routes.js
const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middlewares/auth.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const studentVerificationController = require('../controllers/studentVerification.controller');
const { upload } = require('../middlewares/upload.middleware');

// Student verification routes
router.post('/submit', auth, upload.single('studentIdImage'), studentVerificationController.submitVerification);
router.get('/status', auth, studentVerificationController.checkVerificationStatus);

// Admin routes for managing verification requests
router.get('/pending', studentVerificationController.getPendingVerifications);
router.post('/:verificationId/approve', studentVerificationController.approveVerification);
router.post('/:verificationId/reject', studentVerificationController.rejectVerification);

module.exports = router;