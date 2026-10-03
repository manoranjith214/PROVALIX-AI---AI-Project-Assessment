import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import apiRouter from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';

export function createApp(): Express {
  const app = express();

  // Reverse Proxy Configuration (Render / Production)
  // Environment-aware: enables 1 hop when in production or on Render, false in local dev unless TRUST_PROXY is set
  if (config.trustProxy) {
    app.set('trust proxy', config.trustProxy);
  }

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI to load correctly
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS Configuration: Enforce explicit origin whitelist (rejects '*' and removes localhost in production)
  const allowedOrigins: string[] = [];
  if (config.frontendUrl) allowedOrigins.push(config.frontendUrl.trim().replace(/\/+$/, ''));
  if (config.corsOrigin) {
    config.corsOrigin
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean)
      .forEach((o) => {
        if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
      });
  }

  // Localhost origins are permitted in development / testing only
  if (config.nodeEnv !== 'production') {
    ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'].forEach((loc) => {
      if (!allowedOrigins.includes(loc)) allowedOrigins.push(loc);
    });
  }

  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true);
        const normalized = requestOrigin.trim().replace(/\/+$/, '');
        if (allowedOrigins.includes(normalized) || (config.nodeEnv !== 'production' && normalized.includes('localhost'))) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked: Origin ${requestOrigin} not permitted by Access-Control-Allow-Origin.`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Logging Middleware
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Performance Logging Middleware (Development only)
  if (config.nodeEnv === 'development') {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 150) {
          console.warn(`[PERF WARNING] Slow Request: ${req.method} ${req.originalUrl} - ${duration}ms (status: ${res.statusCode})`);
        } else {
          console.log(`[PERF] ${req.method} ${req.originalUrl} - ${duration}ms (status: ${res.statusCode})`);
        }
      });
      next();
    });
  }

  // Body Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static File Serving for Public Assets only (Avatars, Team Logos)
  // Private submission files and source code must NEVER be exposed publicly without authorization
  app.use('/uploads', (req, res, next) => {
    const requestedPath = req.path;
    // Reject directory traversal
    if (requestedPath.includes('..')) {
      return res.status(403).json({ success: false, message: 'Access denied: Directory traversal detected.' });
    }
    // Block direct public access to private submission or code resources in production
    const isPrivateResource =
      requestedPath.includes('/project-checker') ||
      requestedPath.includes('/submissions') ||
      requestedPath.includes('/private');

    if (isPrivateResource && config.nodeEnv === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Private project files and source code require authenticated access via /api/storage/files.',
      });
    }
    next();
  }, express.static(config.storage.uploadDir));

  // Mount Main API Router under /api
  app.use(config.apiPrefix, apiRouter);

  // Direct root health endpoint for cloud load balancers and container orchestrators
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Root welcome redirect
  app.get('/', (req, res) => {
    res.json({
      name: 'Provalix AI Backend API',
      version: '1.0.0',
      documentation: `${config.apiPrefix}/docs`,
      healthCheck: `${config.apiPrefix}/health`,
    });
  });

  // 404 and Centralized Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
