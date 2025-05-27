// api/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import your existing routes from src folder
const productRoutes = require('../src/routes/product.routes');
const userRoutes = require('../src/routes/user.routes');
const studentVerificationRoutes = require('../src/routes/studentVerification.routes');
const orderRoutes = require('../src/routes/order.routes');
const dashboardRoutes = require('../src/routes/dashboard.routes');
const contactRoutes = require('../src/routes/contact.routes');
const heroImageRoutes = require('../src/routes/heroImageRoutes');
const colorTileRoutes = require('../src/routes/colorTileRoutes');
const subscriberRoutes = require('../src/routes/subscriberRoutes');

const app = express();

// Database connection (cached for serverless)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
  }
  
  try {
    cached.conn = await cached.promise;
    console.log('Connected to MongoDB');
  } catch (err) {
    cached.promise = null;
    console.error('MongoDB connection error:', err);
    throw err;
  }
  
  return cached.conn;
}

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Modify your helmet configuration to properly allow images from your origin
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https://*.vercel.app", "https://res.cloudinary.com"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan('dev'));

// Routes - NO /api prefix needed here (Vercel adds it automatically)
// These will be accessible as /api/products, /api/users, etc.
app.use('/products', productRoutes);
app.use('/users', userRoutes);
app.use('/student-verification', studentVerificationRoutes);
app.use('/orders', orderRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/contact', contactRoutes);
app.use('/hero-images', heroImageRoutes);
app.use('/color-tiles', colorTileRoutes);
app.use('/subscribers', subscriberRoutes);

// Health check routes
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend is working on Vercel!",
    timestamp: new Date().toISOString(),
    routes: [
      '/api/products',
      '/api/users', 
      '/api/student-verification',
      '/api/orders',
      '/api/dashboard',
      '/api/contact',
      '/api/hero-images',
      '/api/color-tiles',
      '/api/subscribers'
    ]
  });
});

app.get('/ping', (req, res) => {
  res.json({ 
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/',
      '/api/ping',
      '/api/products',
      '/api/users',
      '/api/student-verification',
      '/api/orders',
      '/api/dashboard',
      '/api/contact',
      '/api/hero-images',
      '/api/color-tiles',
      '/api/subscribers'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Export for Vercel
module.exports = app;