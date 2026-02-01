import 'dotenv/config';
import { app } from "./app.js";
import connectDB from "./db/index.js"
import fileRoutes from "./routes/file.routes.js"
import userRoutes from "./routes/user.routes.js"
import aliasRoutes from "./routes/alias.routes.js"
import { Alias } from "./models/alias.models.js"

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URL', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 6600;
const isProduction = process.env.NODE_ENV === 'production';

// Logger utility
const logger = {
  info: (msg) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`),
  warn: (msg) => console.warn(`[${new Date().toISOString()}] WARN: ${msg}`),
};

// Cleanup function to delete expired aliases
const cleanupExpiredAliases = async () => {
  try {
    const result = await Alias.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    if (result.deletedCount > 0) {
      logger.info(`🧹 Cleaned up ${result.deletedCount} expired alias(es)`);
    }
  } catch (error) {
    logger.error(`Error cleaning up expired aliases: ${error.message}`);
  }
};

// Run cleanup every hour (3600000 ms)
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
let cleanupIntervalId = null;

// Register routes
app.use("/api/files", fileRoutes);
app.use("/api/users", userRoutes);
app.use("/api/alias", aliasRoutes);

// Redirect short URLs to frontend
app.get('/f/:shortCode', (req, res) => {
  res.redirect(`${process.env.CLIENT_URL}/f/${req.params.shortCode}`);
});

app.get('/g/:shortCode', (req, res) => {
  res.redirect(`${process.env.CLIENT_URL}/g/${req.params.shortCode}`);
});

app.get('/s/:alias', (req, res) => {
  res.redirect(`${process.env.CLIENT_URL}/s/${req.params.alias}`);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl}`);
  res.status(err.status || 500).json({ 
    error: isProduction ? 'Internal server error' : err.message 
  });
});

// Connect to database and start server
let server;
const startServer = async () => {
  try {
    await connectDB();
    
    // Run initial cleanup on startup
    await cleanupExpiredAliases();
    
    // Schedule periodic cleanup
    cleanupIntervalId = setInterval(cleanupExpiredAliases, CLEANUP_INTERVAL);
    
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT} in ${isProduction ? 'production' : 'development'} mode`);
    });
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Clear cleanup interval
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
  }
  
  // Close server
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

startServer();