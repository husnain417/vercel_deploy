// controllers/discount.controller.js
const User = require('../models/user.model');
const Order = require('../models/order.model');
const { calculateDiscount } = require('../utils/discountService'); // Extract to separate service

const discountController = {
  /**
   * Calculate discounts for a user before checkout
   * This allows showing discount information in the cart
   */
  calculateDiscountPreview: async (req, res) => {
    try {
      const { subtotal, pointsToUse = 0 } = req.body;
      const userId = req.user._id;
      
      if (!subtotal) {
        return res.status(400).json({
          success: false,
          message: 'Subtotal is required'
        });
      }
      
      // Get user for points validation and student status
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Validate points usage
      if (pointsToUse > user.rewardPoints) {
        return res.status(400).json({
          success: false,
          message: `Cannot use more points than available. You have ${user.rewardPoints} points.`
        });
      }
      
      // Calculate discount based on user status and order history
      const { amount: discountAmount, reason: discountReason } = await calculateDiscount(userId, subtotal);
      
      // Calculate points value
      const pointsDiscount = pointsToUse; // 1 point = 1 PKR
      
      // Calculate final total
      const total = subtotal - discountAmount - pointsDiscount;
      
      // Calculate points that would be earned from this purchase
      const pointsEarned = Math.floor(total / 100); // 1 point for every 100 PKR
      
      return res.status(200).json({
        success: true,
        subtotal,
        discountAmount,
        discountReason,
        pointsDiscount,
        pointsToUse,
        pointsEarned,
        total: Math.max(0, total) // Ensure total is not negative
      });
    } catch (error) {
      console.error('Error calculating discount preview:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate discount',
        error: error.message
      });
    }
  }
};

module.exports = discountController;