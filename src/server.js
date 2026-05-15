const express = require("express");
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth");
const userInfoRoutes = require("./routes/userInfo");
const dailyCheckInRoutes = require("./routes/dailyCheckIn");
const weeklyCheckInRoutes = require("./routes/weeklyCheckIn");
const targetRoutes = require("./routes/target");
const exerciseRoutes = require("./routes/exercise");
const reportRoutes = require("./routes/report");
const planRoutes = require("./routes/plan");

// Load environment variables
dotenv.config();

// Connect to MongoDB with error handling
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  console.log('Server will continue without database connection...');
}).finally(() => {
  console.log('Database connection attempt completed');
});

const app = express();

// CORS configuration - Support both Flutter and Web Admin
const getDynamicCorsOrigins = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const allowedOrigins = [];

  if (nodeEnv === 'development') {
    // Development: Allow localhost on common ports
    allowedOrigins.push(
      'http://localhost:3000',      // Web admin (React/Vue/Next.js default)
      'http://localhost:3001',      // Alternative web admin port
      'http://localhost:4200',      // Angular default
      'http://localhost:5173',      // Vite default
      'http://localhost:8080',      // Common dev port
      'http://localhost:8081',      // Alternative dev port
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:4200',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8081'
    );
    // Flutter apps can make requests from any origin in development
    allowedOrigins.push('*');
  } else {
    // Production: Only allow specific domains
    allowedOrigins.push(
      'https://coach.classialongevity.com',
      process.env.WEB_ADMIN_URL || 'https://admin.example.com',
      process.env.FLUTTER_APP_URL || 'https://app.example.com'
    );
  }

  return allowedOrigins;
};

const corsOptions = {
  origin: (origin, callback) => {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const allowedOrigins = getDynamicCorsOrigins();

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || nodeEnv === 'development') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-JSON-Response'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  maxAge: 86400 // 24 hours
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(helmet());
app.use(compression()); 

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs for auth
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all routes
app.use(limiter);

// Middleware
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/userinfo", userInfoRoutes);
app.use("/api/daily-checkin", dailyCheckInRoutes);
app.use("/api/weekly-checkin", weeklyCheckInRoutes);
app.use("/api/target", targetRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/plan", planRoutes);

app.get("/", (req, res) => {
  res.send("MyHealth API is running");
});

// Test route to verify routing is working
app.get("/test", (req, res) => {
  res.json({ message: "Test route working", timestamp: new Date().toISOString() });
});

// Catch-all route for unmatched endpoints
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    code: "NOT_FOUND",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      "GET /",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/admin/users",
      "GET /api/userinfo",
      "POST /api/daily-checkin",
      "POST /api/weekly-checkin",
      "POST /api/target/bulk",
      "GET /api/exercises",
      "GET /api/reports",
      "GET /api/plan"
    ]
  });
});

// Global error handling middleware (MUST be last)
app.use((err, req, res, next) => {
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      code: "CORS_ERROR",
      message: "CORS policy violation",
      origin: req.get('origin')
    });
  }

  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    code: err.code || "INTERNAL_ERROR",
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
const nodeEnv = process.env.NODE_ENV || 'development';
console.log('Starting server...');
console.log('Port:', PORT);
console.log('Environment:', nodeEnv);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ Classia Coach Backend Server Started Successfully!\n');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${nodeEnv}`);
  console.log(`🔐 CORS enabled for all configured origins (dev: localhost:*, prod: specific domains)`);
  console.log(`🔑 Auth endpoint: http://localhost:${PORT}/api/auth/login`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`📚 API Base: http://localhost:${PORT}/api\n`);
  if (nodeEnv === 'development') {
    console.log('ℹ️  CORS Settings (Dev): All localhost:* ports allowed');
  } else {
    console.log('ℹ️  CORS Settings (Prod): Only whitelisted domains allowed');
  }
  console.log('');
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
