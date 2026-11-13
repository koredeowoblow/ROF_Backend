import { AppError } from '../core/AppError.js';

/**
 * Class-Based Request Sanitizer Middleware (SOLID - SRP)
 * Recursively sanitizes req.body, req.query, and req.params to prevent:
 * 1. Cross-Site Scripting (XSS) HTML/script tags & inline JS event handlers
 * 2. Prototype Pollution (__proto__, constructor, prototype)
 * 3. NoSQL / Operator Injection (keys starting with '$' or containing null bytes)
 * 4. Deeply nested JSON DoS payloads
 */
export class RequestSanitizer {
  static FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
  static MAX_DEPTH = 12;

  static middleware(options = {}) {
    const sanitizer = new RequestSanitizer(options);
    return sanitizer.handle.bind(sanitizer);
  }

  constructor({ maxDepth = RequestSanitizer.MAX_DEPTH } = {}) {
    this.maxDepth = maxDepth;
  }

  handle(req, res, next) {
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeValue(req.body, 0);
    }
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = this.sanitizeValue({ ...req.query }, 0);
      for (const key of Object.keys(req.query)) {
        delete req.query[key];
      }
      Object.assign(req.query, sanitizedQuery);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = this.sanitizeValue(req.params, 0);
    }
    next();
  }

  sanitizeValue(value, depth = 0) {
    if (depth > this.maxDepth) {
      throw AppError.badRequest('Request payload exceeds maximum allowed nesting depth');
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item, depth + 1));
    }

    if (typeof value === 'object') {
      const cleanObj = {};
      for (const [rawKey, rawVal] of Object.entries(value)) {
        if (RequestSanitizer.FORBIDDEN_KEYS.has(rawKey)) {
          continue;
        }
        if (rawKey.startsWith('$') || rawKey.includes('\0')) {
          continue;
        }
        const cleanKey = this.sanitizeString(rawKey);
        cleanObj[cleanKey] = this.sanitizeValue(rawVal, depth + 1);
      }
      return cleanObj;
    }

    return value;
  }

  sanitizeString(str) {
    return str
      .replace(/\0/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<\/?(?:script|iframe|object|embed|applet|meta|link|style)\b[^>]*>/gi, '')
      .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .trim();
  }
}
