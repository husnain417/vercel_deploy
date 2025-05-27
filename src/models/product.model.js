const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Product description is required']
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Product category is required'],
    },
    gender: {
        type: String,
        required: [true, 'Gender specification is required'],
        enum: ['Men', 'Women','Unisex', 'Male', 'Female']
    },
    // Available colors (basic info)
    colors: [{
        name: String,
        code: String, // color hex code
        isAvailable: {
            type: Boolean,
            default: true
        }
    }],
    // Available sizes (basic info)
    sizes: [{
        name: String,
        isAvailable: {
            type: Boolean,
            default: true
        }
    }],
    // Inventory tracking by color and size
    inventory: [{
        color: String,
        size: String,
        stock: {
            type: Number,
            default: 0
        }
    }],
    // Color-specific images
    defaultImages: [{
        url: String,
        alt: String,
        public_id: String // Add this field for Cloudinary asset tracking
    }],
    
    // Color-specific images
    colorImages: [{
        color: String,
        images: [{
            url: String,
            alt: String,
            isPrimary: {
                type: Boolean,
                default: false
            },
            public_id: String // Add this field for Cloudinary asset tracking
        }]
    }],
    // Total stock across all colors and sizes
    totalStock: {
        type: Number,
        default: 0
    },
    discount: {
        percentage: {
            type: Number,
            default: 0,
            min: [0, 'Discount percentage cannot be negative']
        },
        validUntil: Date
    },
    ratings: [{
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    averageRating: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    material: {
        type: String
    },
    whatInBox: [{
        name: String,
        image: String
    }],
    relatedProducts: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],
    // Modified field: boolean flag instead of array of references
    isCustomersAlsoBought: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Calculate average rating
productSchema.methods.calculateAverageRating = async function() {
    if (this.ratings.length === 0) {
        this.averageRating = 0;
        return;
    }
    
    const sum = this.ratings.reduce((acc, curr) => acc + curr.rating, 0);
    this.averageRating = sum / this.ratings.length;
    await this.save();
};

productSchema.methods.hasSufficientStock = function(color, size, quantity) {
    const inventoryItem = this.inventory.find(
        item => item.color === color && item.size === size
    );

    return inventoryItem && inventoryItem.stock >= quantity;
};

// Update stock for specific color and size
productSchema.methods.updateStock = async function(color, size, quantity) {
    const inventoryItem = this.inventory.find(
        item => item.color === color && item.size === size
    );
    
    if (!inventoryItem) {
        throw new Error('Color and size combination not found');
    }
    
    if (inventoryItem.stock + quantity < 0) {
        throw new Error('Insufficient stock');
    }
    
    inventoryItem.stock += quantity;
    
    // Update total stock
    this.totalStock += quantity;
    
    await this.save();
};

// Recalculate total stock based on inventory
productSchema.methods.recalculateTotalStock = async function() {
    this.totalStock = this.inventory.reduce((total, item) => total + item.stock, 0);
    await this.save();
};

// Add a new method to get images for a specific color
productSchema.methods.getImagesForColor = function(color) {
    const colorImageSet = this.colorImages.find(ci => ci.color === color);
    return colorImageSet ? colorImageSet.images : this.defaultImages;
};

// New method: Set product as "Customers Also Bought"
productSchema.methods.setAsCustomersAlsoBought = async function(status = true) {
    this.isCustomersAlsoBought = status;
    await this.save();
    return this;
};

const Product = mongoose.model('Product', productSchema);

// Static method to fetch all products marked as "Customers Also Bought"
Product.getCustomersAlsoBoughtProducts = async function(limit = 10) {
    return await this.find({ isCustomersAlsoBought: true, isActive: true })
                    .limit(limit)
                    .select('name price description defaultImages colors sizes discount averageRating');
};

module.exports = Product;