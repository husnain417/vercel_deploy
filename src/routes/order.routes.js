const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { upload } = require('../middlewares/upload.middleware');
const discountController = require('../controllers/discount.controller');
const { auth, isAdmin } = require('../middlewares/auth.middleware');

const checkReceiptRequired = (req, res, next) => {
    // We'll apply the upload middleware for all requests and handle logic in controller
    // since we need to determine payment method after parsing the body
    upload.single('receipt')(req, res, next);
  };
  
  // Order creation route with conditional file upload
router.post('/create', auth, checkReceiptRequired, orderController.createOrder);
router.get('/my-orders', auth, orderController.getUserOrders);
router.get('/details/:orderId', auth , orderController.getOrderById);
//router.post('/cancel/:orderId', auth , orderController.cancelOrder);

router.post('/calculate-discount', auth , discountController.calculateDiscountPreview);


// Admin routes
router.get('/all',orderController.getAllOrders);
router.put('/update-status/:orderId',orderController.updateOrderStatus);

module.exports = router;