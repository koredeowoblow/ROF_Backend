/**
 * Custom Application Error Hierarchy (SOLID - OCP & LSP)
 * Preserves error trace across Repository -> Service -> Controller -> Route TryCatch layers.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.layers = [];
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Record that a layer's try/catch block caught, processed, and re-threw this error.
   * Ensures try/catch in Repository, Service, and Controller layers enrich context
   * before bubbling up to the Route-level tryCatchHandler.
   */
  addLayerContext(layer, operation, meta = {}) {
    this.layers.push({
      layer,
      operation,
      timestamp: new Date().toISOString(),
      ...meta,
    });
    return this;
  }

  static wrap(error, layer, operation, fallbackMessage = 'Operation failed', statusCode = 500) {
    if (error instanceof AppError) {
      return error.addLayerContext(layer, operation);
    }
    const wrapped = new AppError(
      error?.message || fallbackMessage,
      error?.statusCode || statusCode,
      error?.code || 'INTERNAL_ERROR'
    );
    wrapped.cause = error;
    wrapped.stack = error?.stack || wrapped.stack;
    return wrapped.addLayerContext(layer, operation);
  }

  static badRequest(message, details = null, code = 'BAD_REQUEST') {
    return new ValidationError(message, details, code);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new UnauthorizedError(message, code);
  }

  static forbidden(message = 'Access denied', code = 'FORBIDDEN') {
    return new ForbiddenError(message, code);
  }

  static idor(
    message = 'Insecure Direct Object Reference blocked: You do not own or have access to this resource'
  ) {
    return new IdorError(message);
  }

  static notFound(resource = 'Resource', id = '') {
    return new NotFoundError(id ? `${resource} (${id}) not found` : `${resource} not found`);
  }

  static conflict(message, code = 'CONFLICT') {
    return new ConflictError(message, code);
  }

  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new AppError(message, 429, 'TOO_MANY_REQUESTS');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null, code = 'VALIDATION_ERROR') {
    super(message, 400, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class IdorError extends ForbiddenError {
  constructor(
    message = 'Access denied: You are not authorized to access or modify this resource reference'
  ) {
    super(message, 'IDOR_VIOLATION');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

