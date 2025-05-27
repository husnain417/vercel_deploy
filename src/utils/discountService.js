// utils/discountService.js

const Order = require('../models/order.model');
const User = require('../models/user.model');

/**
 * Calculate eligible discounts for a given user and subtotal
 * @param {string} userId - User ID to check for discount eligibility
 * @param {number} subtotal - Cart subtotal before discounts
 * @returns {Object} Discount amount and reason
 */
const calculateDiscount = async (userId, subtotal) => {
  const user = await User.findById(userId);
  let discount = 0;
  let discountReasons = [];

  // First order = 10%
  const orderCount = await Order.countDocuments({ user: userId });
  if (orderCount === 0) {
    const firstOrderDiscount = subtotal * 0.1;
    discount += firstOrderDiscount;
    discountReasons.push('First Order Discount (10%)');
  }

  // Verified student = 5%
  if (user.isStudent && user.studentVerified) {
    const studentDiscount = subtotal * 0.05;
    discount += studentDiscount;
    discountReasons.push('Student Discount (5%)');
  }

  // Could add more discount types here:
  // - Seasonal discounts
  // - Loyalty discounts based on total orders
  // - Special promotions

  return {
    amount: discount,
    reason: discountReasons.join(' + ')
  };
};

module.exports = {
  calculateDiscount
};