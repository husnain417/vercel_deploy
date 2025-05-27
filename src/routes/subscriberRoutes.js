const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController');

// Add new subscriber
router.post('/subscribe', subscriberController.addSubscriber);

// Send bulk email to all subscribers
router.post('/send-bulk-email', subscriberController.sendBulkEmail);

module.exports = router; 