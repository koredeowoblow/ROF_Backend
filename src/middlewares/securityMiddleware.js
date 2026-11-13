import crypto from 'node:crypto';
import { AppError } from '../core/AppError.js';
import { config } from '../config/index.js';

/**
 * Class-Based Defense-in-Depth Security Shield (SOLID - SRP)
 * Provides:
 * 1. Dynamic & Strict CORS Origin Validation
 * 2. HTTP Parameter Pollution (HPP) Guard
 * 3. HTTP Method Whitelisting, Encoded Path Traversal Guard & Correlation ID (X-Request-Id)
 * 4. Hardened Security & Sensitive-Route Cache-Control Headers
 */
export class SecurityShield {
  static ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
  static ARRAY_QUERY_WHITELIST = new Set(['tags', 'ids', 'sizes', 'colours']);

  /**
   * Check whether a request Origin is permitted by the configured allowlist
   */
  static isOriginAllowed(origin, allowedOrigins = config.corsOrigins) {
    // Allow same-origin, server-to-server webhooks (Paystack), health checks, and CLI tools
    if (!origin) return true;
    if (allowedOrigins.includes('*')) return true;

    const normalized = origin.trim().replace(/\/+$/, '');
    for (const allowed of allowedOrigins) {
      const rule = allowed.trim().replace(/\/+$/, '');
      if (!rule) continue;
      if (rule === normalized) return true;

      // Support wildcard subdomain patterns like https://*.vercel.app
      if (rule.includes('*.')) {
        const escaped = rule
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace('*\\.', '([a-zA-Z0-9-]+\\.)+');
        const regex = new RegExp(`^${escaped}$`, 'i');
        if (regex.test(normalized)) return true;
      }
    }

    return false;
  }

  /**
   * 1. Dynamic CORS Configuration Options for the `cors` middleware
   */
  static corsOptions(allowedOrigins = config.corsOrigins) {
    return {
      origin(origin, callback) {
        if (SecurityShield.isOriginAllowed(origin, allowedOrigins)) {
          return callback(null, true);
        }
        return callback(
          AppError.forbidden(
            `Cross-Origin Request Blocked: Origin '${origin}' is not permitted by CORS policy`,
            'CORS_NOT_ALLOWED'
          )
        );
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Order-Access-Token',
        'X-Request-Id',
        'X-Paystack-Signature',
        'Accept',
        'Origin',
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-Page',
        'X-Per-Page',
        'X-Total-Pages',
        'X-Order-Access-Token',
        'X-Request-Id',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'Retry-After',
      ],
      maxAge: 86400, // Cache preflight OPTIONS responses for 24 hours
      optionsSuccessStatus: 204,
    };
  }

  /**
   * 2. HTTP Parameter Pollution (HPP) Guard
   * Collapses duplicate query parameters (?sort=a&sort=b) to the last scalar string
   * unless the key is explicitly whitelisted as an array parameter.
   */
  static preventParameterPollution(whitelist = SecurityShield.ARRAY_QUERY_WHITELIST) {
    return (req, res, next) => {
      if (req.query && typeof req.query === 'object') {
        for (const [key, value] of Object.entries(req.query)) {
          if (Array.isArray(value) && !whitelist.has(key)) {
            req.query[key] = value[value.length - 1];
          }
        }
      }
      next();
    };
  }

  /**
   * 3. HTTP Method Whitelist, URL Encoded Traversal Guard & Request Correlation ID
   */
  static methodAndUrlGuard() {
    return (req, res, next) => {
      // Attach or sanitize X-Request-Id for audit correlation
      const incomingId = req.headers?.['x-request-id'];
      const requestId =
        typeof incomingId === 'string' && /^[a-zA-Z0-9-_]{8,64}$/.test(incomingId)
          ? incomingId
          : crypto.randomUUID();

      req.requestId = requestId;
      if (typeof res.setHeader === 'function') {
        res.setHeader('X-Request-Id', requestId);
      }

      // Block unsafe HTTP verbs (TRACE, TRACK, CONNECT, etc.)
      const method = (req.method || 'GET').toUpperCase();
      if (!SecurityShield.ALLOWED_METHODS.has(method)) {
        throw new AppError(`HTTP method '${method}' is not allowed`, 405, 'METHOD_NOT_ALLOWED');
      }

      // Block encoded null bytes or double-encoded traversal in raw URL
      const rawUrl = (req.originalUrl || req.url || '').toLowerCase();
      if (
        rawUrl.includes('%00') ||
        rawUrl.includes('%2e%2e') ||
        rawUrl.includes('%252e') ||
        rawUrl.includes('..\\')
      ) {
        throw AppError.badRequest('Malformed or unsafe URL path detected', null, 'MALFORMED_URL');
      }

      next();
    };
  }

  /**
   * 4. Hardened Security Headers & No-Store Cache Policy for Sensitive Endpoints
   */
  static securityHeaders() {
    return (req, res, next) => {
      if (typeof res.setHeader === 'function') {
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), usb=()');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        const url = (req.originalUrl || req.url || '').toLowerCase();
        if (
          url.includes('/auth') ||
          url.includes('/admin') ||
          url.includes('/orders') ||
          url.includes('/payments') ||
          url.includes('/wishlist')
        ) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
      next();
    };
  }
}
