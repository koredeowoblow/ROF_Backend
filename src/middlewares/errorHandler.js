import { AppError } from '../core/AppError.js';
import { ResponseHandler } from '../utils/responseHandler.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

/**
 * Global Error & 404 Handler Middleware Class (SOLID - SRP)
 * Formats all operational, Mongoose, and unexpected errors using ResponseHandler.
 */
export class GlobalErrorHandler {
  /**
   * Handle unmatched 404 routes
   */
  static notFound(req, res, next) {
    next(AppError.notFound(`Route ${req.method} ${req.originalUrl}`));
  }

  /**
   * Centralized Express 4-argument error handler
   */
  static handle(err, req, res, _next) {
    // 1. Handle malformed JSON syntax errors from express.json()
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return ResponseHandler.error(res, {
        message: 'Invalid JSON payload in request body',
        statusCode: 400,
        code: 'INVALID_JSON',
      });
    }

    // 2. Handle MongoDB duplicate key error (E11000)
    if (err?.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
      return ResponseHandler.error(res, {
        message: `A record with that ${duplicateField} already exists`,
        statusCode: 409,
        code: 'DUPLICATE_KEY',
      });
    }

    // 3. Handle Mongoose Schema ValidationError
    if (err?.name === 'ValidationError' && err?.errors && !(err instanceof AppError)) {
      const fieldErrors = {};
      for (const [key, val] of Object.entries(err.errors)) {
        fieldErrors[key] = val.message;
      }
      return ResponseHandler.error(res, {
        message: 'Database validation failed',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        errors: fieldErrors,
      });
    }

    // 4. Handle Mongoose CastError (invalid ObjectId)
    if (err?.name === 'CastError') {
      return ResponseHandler.error(res, {
        message: `Invalid format for field '${err.path}': ${err.value}`,
        statusCode: 400,
        code: 'INVALID_ID_FORMAT',
      });
    }

    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'An unexpected error occurred';
    const errors = err.details || null;

    if (statusCode >= 500) {
      logger.error(message, {
        code,
        path: req.originalUrl,
        method: req.method,
        stack: err.stack,
      });
    }

    return ResponseHandler.error(res, {
      message,
      statusCode,
      code,
      errors,
      stack: config.env === 'development' && statusCode >= 500 ? err.stack : undefined,
    });
  }
}
