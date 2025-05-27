const Product = require('../models/product.model');
const { catchAsync } = require('../utils/errorHandler');
const fs = require('fs');
const { uploadToCloudinary } = require('../utils/cloudinayUpload');
const asyncHandler = require('express-async-handler');
const path = require('path');

// Create folder if it doesn't exist
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Get all products with filtering
exports.getAllProducts = catchAsync(async (req, res) => {
  const { 
    category, 
    gender, 
    color,
    minPrice, 
    maxPrice, 
    inStock = true, 
    sort = '-createdAt',
    page = 1,
    limit = 20
  } = req.query;
  
  // Build filter object
  const filter = { isActive: true };
  
  if (category) filter.category = category;
  if (gender) filter.gender = gender;
  if (color) filter['colors.name'] = color;
  
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  
  // Check for in-stock items
  if (inStock === 'true') filter.totalStock = { $gt: 0 };
  
  // Execute query with pagination
  const products = await Product.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .select('name price category gender defaultImages colorImages totalStock'); // Select only necessary fields for listing
    
  // Get total count for pagination
  const total = await Product.countDocuments(filter);
  
  res.status(200).json({
    success: true,
    count: products.length,
    total,
    pagination: {
      page: Number(page),
      pages: Math.ceil(total / limit)
    },
    data: products
  });
});

exports.getProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('relatedProducts') // Include full related product details

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  res.status(200).json({
    success: true,
    data: product // This now includes ALL fields from your schema
  });
});


// Get color-specific product details
exports.getProductColorDetails = catchAsync(async (req, res) => {
  const { id, color } = req.params;
  
  const product = await Product.findById(id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  // Check if color exists for this product
  const colorExists = product.colors.some(c => c.name === color);
  if (!colorExists) {
    return res.status(404).json({
      success: false,
      message: 'Color not available for this product'
    });
  }
  
  // Get color-specific images
  const images = product.getImagesForColor(color);
  
  // Get inventory for this color
  const inventory = product.inventory
    .filter(item => item.color === color)
    .map(item => ({
      size: item.size,
      inStock: item.stock > 0,
      stock: item.stock
    }));
  
  res.status(200).json({
    success: true,
    data: {
      color,
      images,
      inventory
    }
  });
});

exports.createProduct = catchAsync(async (req, res) => {
  const productData = req.body;
  
  // Validate required fields
  const requiredFields = ['name', 'description', 'price', 'category', 'gender'];
  const missingFields = requiredFields.filter(field => !productData[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required fields: ${missingFields.join(', ')}`
    });
  }
  
  // Validate colors and sizes arrays
  if (!productData.colors || !Array.isArray(productData.colors) || productData.colors.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one color must be specified'
    });
  }
  
  if (!productData.sizes || !Array.isArray(productData.sizes) || productData.sizes.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one size must be specified'
    });
  }
  
  // Extract color and size names for validation
  const colorNames = productData.colors.map(color => color.name);
  const sizeNames = productData.sizes.map(size => size.name);
  
  // Check for duplicate colors or sizes
  if (new Set(colorNames).size !== colorNames.length) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate color names are not allowed'
    });
  }
  
  if (new Set(sizeNames).size !== sizeNames.length) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate size names are not allowed'
    });
  }
  
  // Initialize inventory if it doesn't exist
  if (!productData.inventory || !Array.isArray(productData.inventory)) {
    productData.inventory = [];
  }
  
  // Validate inventory entries against colors and sizes
  const inventoryMap = new Map();
  
  // Track invalid entries
  const invalidEntries = [];
  
  // Validate each inventory item
  for (const item of productData.inventory) {
    // Check if color exists in declared colors
    if (!colorNames.includes(item.color)) {
      invalidEntries.push(`Inventory item contains undeclared color: ${item.color}`);
      continue;
    }
    
    // Check if size exists in declared sizes
    if (!sizeNames.includes(item.size)) {
      invalidEntries.push(`Inventory item contains undeclared size: ${item.size}`);
      continue;
    }
    
    // Check for non-negative stock
    if (typeof item.stock !== 'number' || item.stock < 0) {
      invalidEntries.push(`Invalid stock value for ${item.color}/${item.size}: ${item.stock}`);
      continue;
    }
    
    // Track this combination
    const key = `${item.color}:${item.size}`;
    if (inventoryMap.has(key)) {
      invalidEntries.push(`Duplicate inventory entry for ${item.color}/${item.size}`);
      continue;
    }
    
    inventoryMap.set(key, item.stock);
  }
  
  // Return error if invalid entries found
  if (invalidEntries.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid inventory entries found',
      errors: invalidEntries
    });
  }
  
  // Check for missing color/size combinations
  const missingCombinations = [];
  
  colorNames.forEach(color => {
    sizeNames.forEach(size => {
      const key = `${color}:${size}`;
      if (!inventoryMap.has(key)) {
        missingCombinations.push(`${color}/${size}`);
      }
    });
  });
  
  // Determine if we should warn or error on missing combinations
  // For this implementation, we'll require complete inventory coverage
  // if (missingCombinations.length > 0) {
  //   return res.status(400).json({
  //     success: false,
  //     message: 'Missing inventory entries for some color/size combinations',
  //     missingCombinations
  //   });
  // }
  
  // Calculate total stock from validated inventory
  productData.totalStock = Array.from(inventoryMap.values()).reduce(
    (total, stock) => total + stock, 0
  );
  
  // Create the product with validated data
  const product = await Product.create(productData);
  
  // Create product image directory after product is created
  const productImageDir = path.join(__dirname, '..', 'uploads', 'products', product._id.toString());
  ensureDirectoryExists(productImageDir);
  
  res.status(201).json({
    success: true,
    data: product
  });
});

exports.updateProduct = catchAsync(async (req, res) => {
  const productId = req.params.id;
  const updates = req.body;

  const existingProduct = await Product.findById(productId);
  if (!existingProduct) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Handle inventory updates
  if (updates.inventory && Array.isArray(updates.inventory)) {
    // Create a lookup map for the incoming inventory items
    const incomingInventoryMap = new Map();
    updates.inventory.forEach(item => {
      const key = `${item.color.toLowerCase()}_${item.size.toUpperCase()}`;
      incomingInventoryMap.set(key, item);
    });
    
    // Process existing inventory and incoming updates
    const processedInventoryKeys = new Set();
    const updatedInventory = [];
    
    // First, handle existing items
    existingProduct.inventory.forEach(existingItem => {
      const normalizedSize = existingItem.size.toUpperCase();
      const key = `${existingItem.color.toLowerCase()}_${normalizedSize}`;
      
      if (incomingInventoryMap.has(key)) {
        // There is an update for this item
        const incomingItem = incomingInventoryMap.get(key);
        
        // Check if the update specifies an "addStock" flag
        if (incomingItem.addStock === true) {
          // Add to existing stock
          updatedInventory.push({
            _id: existingItem._id,
            color: existingItem.color,
            size: normalizedSize,
            stock: (existingItem.stock || 0) + (incomingItem.stock || 0)
          });
        } else {
          // Replace existing stock (default behavior)
          updatedInventory.push({
            _id: existingItem._id,
            color: existingItem.color,
            size: normalizedSize,
            stock: incomingItem.stock
          });
        }
        processedInventoryKeys.add(key);
      } else {
        // No update, keep the existing item as is
        updatedInventory.push({
          _id: existingItem._id,
          color: existingItem.color,
          size: normalizedSize,
          stock: existingItem.stock
        });
      }
    });
    
    // Add new inventory items that don't exist yet
    incomingInventoryMap.forEach((item, key) => {
      if (!processedInventoryKeys.has(key)) {
        updatedInventory.push({
          color: item.color,
          size: item.size.toUpperCase(),
          stock: item.stock
        });
      }
    });
    
    // Update the product's inventory
    existingProduct.inventory = updatedInventory;
    
    // Recalculate totalStock
    existingProduct.totalStock = updatedInventory.reduce(
      (total, item) => total + (item.stock || 0), 0
    );
  }

  // Handle sizes - normalize and deduplicate
  if (updates.sizes && Array.isArray(updates.sizes)) {
    const uniqueSizes = new Map();
    
    // Add existing sizes to the map
    existingProduct.sizes.forEach(size => {
      const normalizedName = size.name.toUpperCase();
      uniqueSizes.set(normalizedName, {
        name: normalizedName,
        isAvailable: size.isAvailable,
        _id: size._id
      });
    });
    
    // Add/update with incoming sizes
    updates.sizes.forEach(size => {
      const normalizedName = size.name.toUpperCase();
      uniqueSizes.set(normalizedName, {
        name: normalizedName,
        isAvailable: size.isAvailable !== undefined ? size.isAvailable : true
      });
    });
    
    existingProduct.sizes = Array.from(uniqueSizes.values());
  }

  // Handle colors - avoid duplicates
  if (updates.colors && Array.isArray(updates.colors)) {
    const uniqueColors = new Map();
    
    // Add existing colors to the map
    existingProduct.colors.forEach(color => {
      uniqueColors.set(color.name.toLowerCase(), {
        name: color.name,
        code: color.code,
        isAvailable: color.isAvailable,
        _id: color._id
      });
    });
    
    // Add new colors that don't exist yet
    updates.colors.forEach(color => {
      const key = color.name.toLowerCase();
      if (!uniqueColors.has(key)) {
        uniqueColors.set(key, {
          name: color.name,
          code: color.code,
          isAvailable: color.isAvailable !== undefined ? color.isAvailable : true
        });
      }
    });
    
    existingProduct.colors = Array.from(uniqueColors.values());
  }

  // Handle all other fields
  for (let key in updates) {
    if (!['inventory', 'sizes', 'colors'].includes(key)) {
      if (typeof updates[key] === 'object' && updates[key] !== null && !Array.isArray(updates[key])) {
        // Merge objects (like discount)
        existingProduct[key] = {
          ...existingProduct[key],
          ...updates[key]
        };
      } else {
        // Simple value assignment
        existingProduct[key] = updates[key];
      }
    }
  }

  await existingProduct.save();
    
  res.status(200).json({
    success: true,
    data: existingProduct
  });
});

// Delete product (permanent deletion)
exports.deleteProduct = catchAsync(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  res.status(200).json({
    success: true,
    message: 'Product deleted permanently'
  });
});

const getCloudinaryFolder = (productId, color = 'default') => {
  return `products/${productId}/${color}`;
};

/**
 * Upload default product images to Cloudinary
 */
exports.uploadDefaultImages = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  // Check if files exist in request
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please upload at least one image'
    });
  }
  
  // Upload each file to Cloudinary
  const cloudinaryFolder = getCloudinaryFolder(productId);
  const uploadPromises = req.files.map(file => 
    uploadToCloudinary(file.path, cloudinaryFolder)
  );
  
  try {
    const cloudinaryResults = await Promise.all(uploadPromises);
    
    // Create image objects from Cloudinary results
    const newImages = cloudinaryResults.map(result => ({
      url: result.secure_url,
      alt: product.name,
      // Store public_id for future reference (e.g., deletion)
      public_id: result.public_id
    }));
    
    // Add new images to product's defaultImages
    product.defaultImages = [...(product.defaultImages || []), ...newImages];
    await product.save();
    
    res.status(200).json({
      success: true,
      data: product.defaultImages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading images to cloud storage',
      error: error.message
    });
  }
});

/**
 * Upload color-specific product images to Cloudinary
 */
exports.uploadColorImages = asyncHandler(async (req, res) => {
  const { id: productId, color } = req.params;
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  // Check if color exists
  const colorExists = product.colors.some(c => c.name === color);
  if (!colorExists) {
    return res.status(400).json({
      success: false,
      message: 'Color not found for this product'
    });
  }
  
  // Check if files exist in request
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please upload at least one image'
    });
  }
  
  // Upload each file to Cloudinary
  const cloudinaryFolder = getCloudinaryFolder(productId, color);
  const uploadPromises = req.files.map(file => 
    uploadToCloudinary(file.path, cloudinaryFolder)
  );
  
  try {
    const cloudinaryResults = await Promise.all(uploadPromises);
    
    // Create image objects from Cloudinary results
    const newImages = cloudinaryResults.map(result => ({
      url: result.secure_url,
      alt: `${product.name} - ${color}`,
      isPrimary: false,
      // Store public_id for future reference (e.g., deletion)
      public_id: result.public_id
    }));
    
    // Check if we already have an entry for this color in colorImages
    const colorImageIndex = product.colorImages.findIndex(ci => ci.color === color);
    
    if (colorImageIndex === -1) {
      // If no existing entry, create a new one
      product.colorImages.push({
        color,
        images: newImages
      });
    } else {
      // If entry exists, append to the existing images
      product.colorImages[colorImageIndex].images = [
        ...product.colorImages[colorImageIndex].images,
        ...newImages
      ];
    }
    
    await product.save();
    
    // Find the colorImages entry to return
    const colorImagesEntry = product.colorImages.find(ci => ci.color === color);
    
    res.status(200).json({
      success: true,
      data: colorImagesEntry ? colorImagesEntry.images : []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading images to cloud storage',
      error: error.message
    });
  }
});

exports.getProductImagesByColor = asyncHandler(async (req, res) => {
  const { id: productId } = req.params;
  const { color } = req.query;
  
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  let images;
  
  if (color) {
    // Use the getImagesForColor method from your model
    images = product.getImagesForColor(color);
  } else {
    // Return default images if no color specified
    images = product.defaultImages;
  }
  
  res.status(200).json({
    success: true,
    data: images
  });
});

// Set primary image for a color
exports.setPrimaryColorImage = catchAsync(async (req, res) => {
  const { id: productId, color, imageId } = req.params;
  
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  // Find the color image set
  const colorImageSet = product.colorImages.find(ci => ci.color === color);
  
  if (!colorImageSet) {
    return res.status(404).json({
      success: false,
      message: 'Color not found for this product'
    });
  }
  
  // Reset all isPrimary flags for this color's images
  colorImageSet.images.forEach(img => {
    img.isPrimary = false;
  });
  
  // Find and set the new primary image
  const imageToSet = colorImageSet.images.find(img => img._id.toString() === imageId);
  
  if (!imageToSet) {
    return res.status(404).json({
      success: false,
      message: 'Image not found'
    });
  }
  
  imageToSet.isPrimary = true;
  
  await product.save();
  
  res.status(200).json({
    success: true,
    message: 'Primary image set successfully',
    data: colorImageSet.images
  });
});

// Update inventory for a specific color/size combination
exports.updateInventory = catchAsync(async (req, res) => {
  const { id: productId } = req.params;
  const { color, size, stock } = req.body;
  
  if (!color || !size || stock === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Color, size, and stock are required'
    });
  }
  
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  // Find the inventory item
  const inventoryItem = product.inventory.find(
    item => item.color === color && item.size === size
  );
  
  if (inventoryItem) {
    // Update existing inventory item
    const oldStock = inventoryItem.stock;
    inventoryItem.stock = Number(stock);
    
    // Update total stock
    product.totalStock += (Number(stock) - oldStock);
  } else {
    // Create new inventory item
    product.inventory.push({
      color,
      size,
      stock: Number(stock)
    });
    
    // Update total stock
    product.totalStock += Number(stock);
  }
  
  await product.save();
  
  res.status(200).json({
    success: true,
    message: 'Inventory updated successfully',
    data: {
      color,
      size,
      stock: Number(stock),
      totalStock: product.totalStock
    }
  });
});

// Get inventory for a specific color
exports.getColorInventory = catchAsync(async (req, res) => {
  const { id: productId, color } = req.params;
  
  const product = await Product.findById(productId);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  // Filter inventory by color
  const inventory = product.inventory.filter(item => item.color === color);
  
  res.status(200).json({
    success: true,
    color,
    data: inventory.map(item => ({
      size: item.size,
      stock: item.stock,
      inStock: item.stock > 0
    }))
  });
});

exports.getProductStats = catchAsync(async (req, res) => {
  // Get total products count
  const totalProducts = await Product.countDocuments();
  
  // Get active products count (where isActive is true)
  const activeProducts = await Product.countDocuments({ isActive: true });
  
  // Get out of stock products count (where totalStock is 0)
  const outOfStockProducts = await Product.countDocuments({ 
    isActive: true,
    totalStock: 0
  });
  
  // Get low stock products (where totalStock is less than 10 but greater than 0)
  const lowStockProducts = await Product.countDocuments({
    isActive: true,
    totalStock: { $gt: 0, $lt: 10 }
  });
  
  // Get stats about unique products vs total units
  const inventoryStats = await Product.aggregate([
    // Match only active products
    { $match: { isActive: true } },
    // Unwind the inventory array to get individual items
    { $unwind: "$inventory" },
    // Group by product ID to count colors and total units
    { 
      $group: {
        _id: "$_id",
        productName: { $first: "$name" },
        uniqueColors: { $addToSet: "$inventory.color" },
        uniqueSizes: { $addToSet: "$inventory.size" },
        totalUnits: { $sum: "$inventory.stock" }
      }
    },
    // Group all results to get summary statistics
    {
      $group: {
        _id: null,
        uniqueProductCount: { $sum: 1 },
        totalUnitCount: { $sum: "$totalUnits" },
        // Calculate average units per product
        avgUnitsPerProduct: { $avg: "$totalUnits" },
        // Count products with multiple colors
        multiColorProducts: { 
          $sum: { 
            $cond: [{ $gt: [{ $size: "$uniqueColors" }, 1] }, 1, 0] 
          }
        },
        // Count total color variations across all products
        totalColorVariations: { $sum: { $size: "$uniqueColors" } },
        // Count total size variations across all products
        totalSizeVariations: { $sum: { $size: "$uniqueSizes" } }
      }
    }
  ]);
  
  // Format the inventory stats
  const inventorySummary = inventoryStats.length > 0 ? inventoryStats[0] : {
    uniqueProductCount: 0,
    totalUnitCount: 0,
    avgUnitsPerProduct: 0,
    multiColorProducts: 0,
    totalColorVariations: 0,
    totalSizeVariations: 0
  };
  
  // Remove _id field from result
  delete inventorySummary._id;
  
  res.status(200).json({
    success: true,
    stats: {
      total: totalProducts,
      active: activeProducts,
      outOfStock: outOfStockProducts,
      lowStock: lowStockProducts,
      inventory: inventorySummary
    }
  });
});

exports.addToCustomersAlsoBought = async (req, res) => {
  try {
      const { productId } = req.body;
      
      if (!productId) {
          return res.status(400).json({
              success: false,
              message: 'Product ID is required'
          });
      }
      
      const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { isCustomersAlsoBought: true },
          { new: true }
      );
      
      if (!updatedProduct) {
          return res.status(404).json({
              success: false,
              message: 'Product not found'
          });
      }
      
      return res.status(200).json({
          success: true,
          message: 'Product added to "Customers Also Bought" section',
          data: updatedProduct
      });
  } catch (error) {
      return res.status(500).json({
          success: false,
          message: 'Error updating product status',
          error: error.message
      });
  }
};

exports.removeFromCustomersAlsoBought = async (req, res) => {
  try {
      const { productId } = req.body;
      
      if (!productId) {
          return res.status(400).json({
              success: false,
              message: 'Product ID is required'
          });
      }
      
      const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          { isCustomersAlsoBought: false },
          { new: true }
      );
      
      if (!updatedProduct) {
          return res.status(404).json({
              success: false,
              message: 'Product not found'
          });
      }
      
      return res.status(200).json({
          success: true,
          message: 'Product removed from "Customers Also Bought" section',
          data: updatedProduct
      });
  } catch (error) {
      return res.status(500).json({
          success: false,
          message: 'Error updating product status',
          error: error.message
      });
  }
};

exports.getCustomersAlsoBoughtProducts = async (req, res) => {
  try {
      const limit = parseInt(req.query.limit) || 10;
      
      const products = await Product.find({ isCustomersAlsoBought: true, isActive: true })
          .limit(limit)
          .select('name category price description defaultImages colors sizes discount averageRating');
      
      return res.status(200).json({
          success: true,
          count: products.length,
          data: products
      });
  } catch (error) {
      return res.status(500).json({
          success: false,
          message: 'Error fetching products',
          error: error.message
      });
  }
};

exports.fixStock = catchAsync(async (req, res) => {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    await product.recalculateTotalStock();
    
    res.status(200).json({
      success: true,
      message: `Total stock updated to ${product.totalStock}`,
      data: product
    });
  });