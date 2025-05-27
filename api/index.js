const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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

// Import routes with error handling
let productRoutes, userRoutes, studentVerificationRoutes, orderRoutes, 
    dashboardRoutes, contactRoutes, heroImageRoutes, colorTileRoutes, subscriberRoutes;

try {
  productRoutes = require('../src/routes/product.routes');
  userRoutes = require('../src/routes/user.routes');
  studentVerificationRoutes = require('../src/routes/studentVerification.routes');
  orderRoutes = require('../src/routes/order.routes');
  dashboardRoutes = require('../src/routes/dashboard.routes');
  contactRoutes = require('../src/routes/contact.routes');
  heroImageRoutes = require('../src/routes/heroImageRoutes');
  colorTileRoutes = require('../src/routes/colorTileRoutes');
  subscriberRoutes = require('../src/routes/subscriberRoutes');
  console.log('Routes imported successfully');
} catch (error) {
  console.error('Error importing routes:', error);
}

// Health check routes FIRST
app.get("/", (req, res) => {
  res.json({ 
    message: "Backend is working on Vercel!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
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

// Test route to debug
app.get('/test', (req, res) => {
  res.json({
    message: 'Test route working!',
    timestamp: new Date().toISOString(),
    routesLoaded: {
      productRoutes: !!productRoutes,
      userRoutes: !!userRoutes,
      studentVerificationRoutes: !!studentVerificationRoutes,
      orderRoutes: !!orderRoutes,
      dashboardRoutes: !!dashboardRoutes,
      contactRoutes: !!contactRoutes,
      heroImageRoutes: !!heroImageRoutes,
      colorTileRoutes: !!colorTileRoutes,
      subscriberRoutes: !!subscriberRoutes
    }
  });
});

// API Routes - AFTER the basic routes
if (productRoutes) {
  app.use('/products', productRoutes);
  console.log('Product routes loaded');
}
if (userRoutes) {
  app.use('/users', userRoutes);
  console.log('User routes loaded');
}
if (studentVerificationRoutes) {
  app.use('/student-verification', studentVerificationRoutes);
  console.log('Student verification routes loaded');
}
if (orderRoutes) {
  app.use('/orders', orderRoutes);
  console.log('Order routes loaded');
}
if (dashboardRoutes) {
  app.use('/dashboard', dashboardRoutes);
  console.log('Dashboard routes loaded');
}
if (contactRoutes) {
  app.use('/contact', contactRoutes);
  console.log('Contact routes loaded');
}
if (heroImageRoutes) {
  app.use('/hero-images', heroImageRoutes);
  console.log('Hero image routes loaded');
}
if (colorTileRoutes) {
  app.use('/color-tiles', colorTileRoutes);
  console.log('Color tile routes loaded');
}
if (subscriberRoutes) {
  app.use('/subscribers', subscriberRoutes);
  console.log('Subscriber routes loaded');
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler - MUST be absolutely last
app.use((req, res) => {
  console.log('404 - Route not found:', req.originalUrl, 'Method:', req.method);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Export for Vercel
module.exports = app;