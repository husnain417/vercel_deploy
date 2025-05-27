const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        productName: String,
        color: String,
        size: String,
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity cannot be less than 1']
        },
        price: {
            type: Number,
            required: true
        }
    }],
    shippingAddress: {
        fullName: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        phoneNumber: String
    },
    subtotal: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    discountCode: String,
    pointsUsed: {
        type: Number,
        default: 0
    },
    pointsEarned: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['cash-on-delivery', 'bank-transfer'],
        default: 'COD'
    },
    paymentReceipt: {
        url: String,
        public_id: String,
        uploaded: {
            type: Boolean,
            default: false
        }
    },
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
    },
    trackingNumber: String,
    notes: String,
    isFirstOrder: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;