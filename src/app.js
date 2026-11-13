import express from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { Container } from './container.js';
import { ResponseHandler } from './utils/responseHandler.js';
import { RequestSanitizer } from './middlewares/requestSanitizer.js';
import { IdorProtection } from './middlewares/idorProtection.js';
import { RateLimiter } from './middlewares/rateLimiter.js';
import { SecurityShield } from './middlewares/securityMiddleware.js';
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

  // Trust first reverse proxy hop (Render / Railway / Nginx / Cloudflare) for accurate rate-limit IP
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // 1. Method Whitelist, URL Traversal Guard, Correlation ID & Hardened Security Headers
  app.use(routeTryCatch(SecurityShield.methodAndUrlGuard()));
  app.use(SecurityShield.securityHeaders());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'none'"],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // 2. Dynamic & Strict CORS Policy
  app.use(cors(SecurityShield.corsOptions(config.corsOrigins)));

  // Serve seeded product & category images from /images
  app.use('/images', express.static(path.resolve(process.cwd(), 'public/images')));

  // 3. Global Sliding-Window Rate Limiter (protects against API floods & enumeration)
  app.use('/api', routeTryCatch(RateLimiter.global()));
  app.use('/v1', routeTryCatch(RateLimiter.global()));

  // 4. Body Parsing with strict size limits to prevent payload DoS
  app.use(express.json({ limit: '250kb' }));
  app.use(express.urlencoded({ extended: true, limit: '250kb' }));

  // 5. Unified Response Handler Middleware
  app.use(ResponseHandler.middleware());

  // 6. HTTP Parameter Pollution (HPP) Guard & Global Request Sanitizer (XSS, Prototype Pollution, Operator Injection)
  app.use(SecurityShield.preventParameterPollution());
  app.use(routeTryCatch(RequestSanitizer.middleware()));

  // 7. Global IDOR Mass-Assignment & Path Traversal Guard
  app.use(routeTryCatch(IdorProtection.preventMassAssignmentAndTraversal()));

  // 8. Mount API Routes under /api/v1 (and /v1 alias)
  const apiRouter = createApiRouter(container);
  app.use('/api/v1', apiRouter);
  app.use('/v1', apiRouter);

  // 9. 404 Not Found & Centralized Error Handler
  app.use(GlobalErrorHandler.notFound);
  app.use(GlobalErrorHandler.handle);

  app.locals.container = container;
  return app;
}

