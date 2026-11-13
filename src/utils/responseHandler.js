/**
 * Unified Class-Based Response Handler (SOLID - SRP & DRY)
 * Standardizes all API HTTP responses (success, created, paginated, noContent, error).
 * Supports both standardized envelope format and direct payload mode (?raw=true) for client flexibility.
 */
export class ResponseHandler {
  /**
   * Standard 200 OK (or custom 2xx) response
   */
  static success(
    res,
    { data = null, message = 'Success', statusCode = 200, meta = null, headers = {} } = {}
  ) {
    ResponseHandler.#applyHeaders(res, headers);

    if (ResponseHandler.#isRawMode(res.req)) {
      return res.status(statusCode).json(data);
    }

    const payload = {
      success: true,
      statusCode,
      message,
      data,
      ...(meta ? { meta } : {}),
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(payload);
  }

  /**
   * Standard 201 Created response
   */
  static created(
    res,
    { data = null, message = 'Resource created successfully', meta = null, headers = {} } = {}
  ) {
    return ResponseHandler.success(res, {
      data,
      message,
      statusCode: 201,
      meta,
      headers,
    });
  }

  /**
   * Standard Paginated response with pagination metadata & HTTP headers
   */
  static paginated(
    res,
    { data = [], pagination = {}, message = 'Records retrieved successfully', headers = {} } = {}
  ) {
    const paginationHeaders = {
      'X-Total-Count': String(pagination.totalItems ?? data.length),
      'X-Page': String(pagination.page ?? 1),
      'X-Per-Page': String(pagination.limit ?? data.length),
      'X-Total-Pages': String(pagination.totalPages ?? 1),
      ...headers,
    };

    ResponseHandler.#applyHeaders(res, paginationHeaders);

    if (ResponseHandler.#isRawMode(res.req)) {
      return res.status(200).json(data);
    }

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Standard 204 No Content response
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Standard Error response used by GlobalErrorHandler & controllers
   */
  static error(
    res,
    {
      message = 'Internal Server Error',
      statusCode = 500,
      code = 'INTERNAL_ERROR',
      errors = null,
      layers = undefined,
      stack = undefined,
    } = {}
  ) {
    const payload = {
      success: false,
      statusCode,
      code,
      message,
      ...(errors ? { errors } : {}),
      ...(layers && layers.length > 0 ? { layers } : {}),
      ...(stack ? { stack } : {}),
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(payload);
  }

  /**
   * Express middleware that attaches helper methods directly to the res object
   */
  static middleware() {
    return (req, res, next) => {
      res.sendSuccess = (options) => ResponseHandler.success(res, options);
      res.sendCreated = (options) => ResponseHandler.created(res, options);
      res.sendPaginated = (options) => ResponseHandler.paginated(res, options);
      res.sendNoContent = () => ResponseHandler.noContent(res);
      res.sendError = (options) => ResponseHandler.error(res, options);
      next();
    };
  }

  static #applyHeaders(res, headers = {}) {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        res.setHeader(key, value);
      }
    }
  }

  static #isRawMode(req) {
    if (!req) return false;
    return (
      req.query?.envelope === 'false' ||
      req.query?.raw === 'true' ||
      req.headers?.['x-response-format'] === 'raw'
    );
  }
}

