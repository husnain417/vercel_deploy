const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Database connection (cached for serverless)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;
  
  if (!cached.promise) {
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI environment variable is not set');
      return null;
    }
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
  }
  
  return cached.conn;
}

// Connect to database
connectDB();

// Basic middleware
app.use(express.json());
app.use(cors());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Basic routes - define these BEFORE trying to import other routes
app.get("/", (req, res) => {
  console.log('Root route hit');
  res.json({ 
    message: "Backend is working on Vercel!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    routes: [
      '/api/',
      '/api/ping',
      '/api/test',
      '/api/health'
    ]
  });
});

app.get('/ping', (req, res) => {
  console.log('Ping route hit');
  res.json({ 
    message: 'pong',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('Health route hit');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: cached.conn ? 'connected' : 'disconnected'
  });
});

app.get('/test', (req, res) => {
  console.log('Test route hit');
  res.json({
    message: 'Test route working!',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasMongoUri: !!process.env.MONGODB_URI,
      platform: process.platform,
      nodeVersion: process.version
    }
  });
});

// Try to import and use your routes
let routesLoaded = {};

// Import routes one at a time with detailed error handling
const routesToLoad = [
  { name: 'products', path: '../src/routes/product.routes', route: '/products' },
  { name: 'users', path: '../src/routes/user.routes', route: '/users' },
  { name: 'student-verification', path: '../src/routes/studentVerification.routes', route: '/student-verification' },
  { name: 'orders', path: '../src/routes/order.routes', route: '/orders' },
  { name: 'dashboard', path: '../src/routes/dashboard.routes', route: '/dashboard' },
  { name: 'contact', path: '../src/routes/contact.routes', route: '/contact' },
  { name: 'hero-images', path: '../src/routes/heroImageRoutes', route: '/hero-images' },
  { name: 'color-tiles', path: '../src/routes/colorTileRoutes', route: '/color-tiles' },
  { name: 'subscribers', path: '../src/routes/subscriberRoutes', route: '/subscribers' }
];

routesToLoad.forEach(({ name, path, route }) => {
  try {
    const routeModule = require(path);
    app.use(route, routeModule);
    routesLoaded[name] = true;
    console.log(`✅ Loaded ${name} routes at ${route}`);
  } catch (error) {
    routesLoaded[name] = false;
    console.error(`❌ Failed to load ${name} routes:`, error.message);
  }
});

// Route to check which routes loaded
app.get('/routes-status', (req, res) => {
  res.json({
    message: 'Routes loading status',
    routesLoaded,
    timestamp: new Date().toISOString()
  });
});

// Simple test route for your API routes
app.get('/products/test', (req, res) => {
  res.json({ message: 'Products test route working directly' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error middleware caught:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404 handler - MUST be last
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /',
      'GET /ping', 
      'GET /test',
      'GET /health',
      'GET /routes-status',
      'GET /products/test',
      ...Object.keys(routesLoaded).filter(key => routesLoaded[key]).map(key => `* /${key.replace('-', '/')}`),
    ]
  });
});

console.log('API module loaded');

module.exports = app;