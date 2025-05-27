const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const productController = require('../controllers/product.controller');
const { auth, isAdmin } = require('../middlewares/auth.middleware');

router.get('/stats', orderController.getOrderStats);
router.get('/bestselling', orderController.getBestSellingProducts);
router.get('/student-verifications', orderController.getRecentStudentVerifications);
router.get('/product-stats', productController.getProductStats);

module.exports = router;