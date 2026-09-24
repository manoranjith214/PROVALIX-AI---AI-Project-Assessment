import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import apiRouter from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware';

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI to load correctly
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: Array.from(new Set([config.frontendUrl, config.corsOrigin, 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'].filter(Boolean))),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Logging Middleware
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  // Body Parsing Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static File Serving for Uploaded Assets
  app.use('/uploads', express.static(config.storage.uploadDir));

  // Mount Main API Router under /api
  app.use(config.apiPrefix, apiRouter);

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
