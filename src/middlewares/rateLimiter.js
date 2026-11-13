import { AppError } from '../core/AppError.js';
import { config } from '../config/index.js';

/**
 * Class-Based Sliding-Window / Fixed-Bucket Rate Limiter (SOLID - SRP & OCP)
 * Protects endpoints against brute-force credential stuffing, enumeration, and DoS floods.
 * Emits standard RFC-compliant rate limit headers:
 * - X-RateLimit-Limit
 * - X-RateLimit-Remaining
 * - X-RateLimit-Reset
 * - Retry-After
 */
export class RateLimiter {
  constructor({
    windowMs = 60 * 1000,
    max = 120,
    keyPrefix = 'global',
    message = 'Too many requests from this IP, please try again shortly.',
    skip = null,
  } = {}) {
    this.windowMs = windowMs;
    this.max = max;
    this.keyPrefix = keyPrefix;
    this.message = message;
    this.skip = skip;
    this.clients = new Map();
    this.lastCleanup = Date.now();
  }

  /**
   * Extract client IP safely (supporting X-Forwarded-For when behind a trusted reverse proxy)
   */
  extractClientIp(req) {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }

  /**
   * Periodically prune expired client buckets to prevent unbounded memory growth
   */
  cleanupExpired(now) {
    if (now - this.lastCleanup < Math.max(this.windowMs, 30000)) {
      return;
    }
    this.lastCleanup = now;
    for (const [key, record] of this.clients.entries()) {
      if (now >= record.resetAt) {
        this.clients.delete(key);
      }
    }
  }

  /**
   * Express middleware handler
   */
  handle(req, res, next) {
    if (typeof this.skip === 'function' && this.skip(req)) {
      return next();
    }

    const now = Date.now();
    this.cleanupExpired(now);

    const ip = this.extractClientIp(req);
    const key = `${this.keyPrefix}:${ip}`;

    let bucket = this.clients.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        count: 0,
        resetAt: now + this.windowMs,
      };
      this.clients.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, this.max - bucket.count);
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    if (typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', String(this.max));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    }

    if (bucket.count > this.max) {
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(resetSeconds));
      }
      throw AppError.tooManyRequests(this.message);
    }

    next();
  }

  static create(options = {}) {
    const limiter = new RateLimiter(options);
    const fn = limiter.handle.bind(limiter);
    fn.limiterInstance = limiter;
    return fn;
  }

  /**
   * 1. Global API Rate Limiter (default: 120 requests / 1 min per IP)
   */
  static global(overrides = {}) {
    return RateLimiter.create({
      windowMs: config.rateLimit?.globalWindowMs || 60000,
      max: config.rateLimit?.globalMax || 120,
      keyPrefix: 'global',
      message: 'Rate limit exceeded. Please wait a moment before making more requests.',
      ...overrides,
    });
  }

  /**
   * 2. Strict Authentication Brute-Force Limiter (default: 10 attempts / 15 min per IP)
   */
  static auth(overrides = {}) {
    return RateLimiter.create({
      windowMs: config.rateLimit?.authWindowMs || 15 * 60 * 1000,
      max: config.rateLimit?.authMax || 10,
      keyPrefix: 'auth',
      message: 'Too many authentication attempts. Please wait 15 minutes before retrying.',
      ...overrides,
    });
  }

  /**
   * 3. Payment & Order Checkout Limiter (default: 20 requests / 10 min per IP)
   */
  static payment(overrides = {}) {
    return RateLimiter.create({
      windowMs: config.rateLimit?.paymentWindowMs || 10 * 60 * 1000,
      max: config.rateLimit?.paymentMax || 20,
      keyPrefix: 'payment',
      message: 'Too many checkout or payment requests. Please wait a few minutes and try again.',
      ...overrides,
    });
  }

  /**
   * 4. Public Write Limiter for Contact Messages, Reviews & Newsletter (default: 15 requests / 10 min per IP)
   */
  static publicWrite(overrides = {}) {
    return RateLimiter.create({
      windowMs: config.rateLimit?.writeWindowMs || 10 * 60 * 1000,
      max: config.rateLimit?.writeMax || 15,
      keyPrefix: 'write',
      message: 'Submission rate limit reached. Please wait a few minutes before submitting again.',
      ...overrides,
    });
  }
}

