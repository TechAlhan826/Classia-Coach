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

// CORS — single flat allowlist covering all environments.
// No dev/prod split — Vercel sets NODE_ENV='production' even during local testing
// through the CLI, which caused localhost to get blocked. Flat list is simpler
// and explicit about what's actually allowed.
const ALLOWED_ORIGINS = [
  // Local development
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
  // Production — admin panel
  'https://classia-admin.vercel.app',
  'http://classia-admin.vercel.app',
  // Production — main web
  'https://coach.classialongevity.com',
  'http://coach.classialongevity.com',
];

const corsOptions = {
  origin: function (origin, callback) {
    // No origin = mobile app / Postman / cURL — always allow
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // Log blocked origins so we can add them if legit
    console.warn(`⚠️  CORS blocked origin: ${origin}`);
    // Return false (not an Error) so express-cors sends a 403 with headers
    // instead of throwing a 500 that arrives with no CORS headers at all
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Target-User'],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  optionsSuccessStatus: 200,
  maxAge: 86400  // browser caches preflight for 24h
};

// CORS must be the very first middleware — preflight OPTIONS must be handled
// before any auth/rate-limit middleware touches the request
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode}`);
  });
  next();
});

// Apply rate limiting
app.use(limiter);

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
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`❌ Error: ${statusCode} - ${message}`, {
    url: req.originalUrl,
    method: req.method,
    origin: req.get('origin'),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    code: err.code || 'ERROR',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { details: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
const nodeEnv = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, '0.0.0.0', () => {
  const isDev = nodeEnv !== 'production';
  console.log('\n✅ FitAura Backend Server Started!\n');
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔧 Environment: ${nodeEnv}`);
  if (isDev) {
    console.log(`🌐 CORS: http://localhost:3000, http://localhost:5173 + Mobile Apps`);
  } else {
    console.log(`🌐 CORS: https://coach.classialongevity.com, https://fitaura-admin.vercel.app`);
  }
  console.log(`🔑 API Base: http://localhost:${PORT}/api`);
  console.log(`🧪 Test: http://localhost:${PORT}/test\n`);
}).on('error', (err) => {
  console.error('❌ Server failed:', err.message);
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
