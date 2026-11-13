import express from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { Container } from './container.js';
import { ResponseHandler } from './utils/responseHandler.js';
import { RequestSanitizer } from './middlewares/requestSanitizer.js';
import { IdorProtection } from './middlewares/idorProtection.js';
import { GlobalErrorHandler } from './middlewares/errorHandler.js';
import { routeTryCatch } from './middlewares/tryCatchHandler.js';
import { createApiRouter } from './routes/index.js';

/**
 * Express Application Factory (SOLID - DIP & OCP)
 */
export function createApp(containerOverrides = {}) {
  const app = express();
  const container =
    containerOverrides instanceof Container
      ? containerOverrides
      : new Container(containerOverrides);

  // 1. Security Headers & CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      exposedHeaders: [
        'X-Total-Count',
        'X-Page',
        'X-Per-Page',
        'X-Total-Pages',
        'X-Order-Access-Token',
      ],
    })
  );

  // Serve seeded product & category images from /images
  app.use('/images', express.static(path.resolve(process.cwd(), 'public/images')));

  // 2. Body Parsing with size limits to prevent payload DoS
  app.use(express.json({ limit: '250kb' }));
  app.use(express.urlencoded({ extended: true, limit: '250kb' }));

  // 3. Unified Response Handler Middleware
  app.use(ResponseHandler.middleware());

  // 4. Global Request Sanitizer (XSS, Prototype Pollution, Operator Injection)
  app.use(routeTryCatch(RequestSanitizer.middleware()));

  // 5. Global IDOR Mass-Assignment & Path Traversal Guard
  app.use(routeTryCatch(IdorProtection.preventMassAssignmentAndTraversal()));

  // 6. Mount API Routes under /api/v1 (and /v1 alias)
  const apiRouter = createApiRouter(container);
  app.use('/api/v1', apiRouter);
  app.use('/v1', apiRouter);

  // 7. 404 Not Found & Centralized Error Handler
  app.use(GlobalErrorHandler.notFound);
  app.use(GlobalErrorHandler.handle);

  app.locals.container = container;
  return app;
}

