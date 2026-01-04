// MUST be imported first to load environment variables
import "./env";

import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { getPool, closePool } from "./config/database";
import { testEmailConnection } from "./config/email";
import { logger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { validateJWTSecrets } from "./utils/tokenHelper";
import { CleanupService } from "./services/cleanup.service";

// Import routes
import authRoutes from "./routes/auth.routes";
import publicRoutes from "./routes/public.routes";
import menuRoutes from "./routes/menu.routes";
import menuItemsRoutes from "./routes/menuItems.routes";
import categoryRoutes from "./routes/category.routes";
import userRoutes from "./routes/user.routes";
import adminRoutes from "./routes/admin.routes";
import uploadRoutes from "./routes/upload.routes";
import adsRoutes from "./routes/ads.routes";
import notificationRoutes from "./routes/notification.routes";
import { ensureUploadDirectories } from "./controllers/upload.controller";
import { startSubscriptionScheduler } from "./services/subscriptionNotificationService";

logger.debug("Environment check after loading:", {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
});

// Validate JWT secrets on startup
validateJWTSecrets();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

// In production, only allow specific origins
if (process.env.NODE_ENV === 'production') {
  // Remove localhost from production
  const productionOrigins = allowedOrigins.filter(
    origin => !origin.includes('localhost') && !origin.includes('127.0.0.1')
  );
  if (productionOrigins.length === 0) {
    logger.error('🔴 SECURITY WARNING: No production origins configured for CORS!');
  }
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      // But only in development
      if (!origin && process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      
      if (!origin) {
        return callback(new Error('Origin not allowed by CORS'));
      }
      
      // In development, allow all localhost origins including subdomains
      if (process.env.NODE_ENV === 'development') {
        // Allow localhost with any subdomain on port 3000
        if (origin.match(/^https?:\/\/([a-zA-Z0-9-]+\.)?localhost:3000$/)) {
          return callback(null, true);
        }
        // Allow 127.0.0.1
        if (origin.match(/^https?:\/\/127\.0\.0\.1:3000$/)) {
          return callback(null, true);
        }
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        logger.warn(`🔴 CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type"],
    maxAge: 86400, // 24 hours cache for preflight requests
  })
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files (uploads) with CORS headers
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, "../uploads")));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/menus", menuItemsRoutes);
app.use("/api", categoryRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", adsRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Ensure upload directories exist
    await ensureUploadDirectories();
    logger.info("✅ Upload directories initialized");

    // Test database connection
    try {
      await getPool();
      logger.info("✅ Database connected successfully");
    } catch (error) {
      logger.error("❌ Database connection failed:", error);
      logger.warn(
        "⚠️  Server will start anyway but database features won't work"
      );
    }

    // Test email connection (optional - non-blocking)
    testEmailConnection()
      .then(() => {
        logger.info("✅ Email connection tested successfully");
      })
      .catch((error) => {
        logger.warn("⚠️  Email connection failed - emails won't be sent");
        logger.debug("Email error details:", error.message);
      });

    // Start cleanup service
    CleanupService.start();

    // Start subscription notification scheduler
    startSubscriptionScheduler();

    app.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
      logger.info("✅ Server started successfully!");
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  CleanupService.stop();
  await closePool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT signal received: closing HTTP server");
  CleanupService.stop();
  await closePool();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

startServer();

export default app;
