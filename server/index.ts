import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// CORS configuration for production
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize and start server
const startServer = async () => {
  console.log('[STARTUP] Starting server initialization...');
  console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
  console.log('[STARTUP] MONGO_URL:', process.env.MONGO_URL ? 'SET' : 'NOT SET');
  
  try {
    console.log('[STARTUP] Registering routes...');
    const server = await registerRoutes(app);
    console.log('[STARTUP] Routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error(err);
    });

    // Setup Vite in development, serve static in production
    if (app.get("env") === "development") {
      console.log('[STARTUP] Setting up Vite dev server...');
      await setupVite(app, server);
    } else {
      console.log('[STARTUP] Serving static files (production mode)...');
      serveStatic(app);
    }

    const port = process.env.PORT || 3000;
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      console.log(`[STARTUP] Server ready and listening on port ${port}`);
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('[STARTUP] Failed to start server:', error);
    process.exit(1);
  }
};

// Start server
startServer();

// Export app for Vercel serverless (if needed)
export default app;
