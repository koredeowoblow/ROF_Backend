import crypto from 'node:crypto';
import { config } from '../config/index.js';

/**
 * Cryptographic & Token Security Utility Class (SRP)
 * Handles password hashing, JWT-style HMAC tokens, and IDOR resource ownership signatures.
 */
export class CryptoService {
  constructor(secret = config.security.jwtSecret, orderSecret = config.security.orderTokenSecret) {
    this.secret = secret;
    this.orderSecret = orderSecret;
  }

  /**
   * Hash a plain-text password using scrypt with random salt
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(String(password), salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
  }

  /**
   * Verify a plain-text password against stored salt:hash using constant-time comparison
   */
  verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedBuffer = crypto.scryptSync(String(password), salt, 64);
    if (keyBuffer.length !== derivedBuffer.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
  }

  /**
   * Issue a signed stateless session token (HMAC-SHA256)
   */
  signToken(payload, expiresInMs = config.security.jwtExpiresInMs) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        iat: Date.now(),
        exp: Date.now() + expiresInMs,
        jti: crypto.randomUUID(),
      })
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  /**
   * Verify and decode a signed session token
   */
  verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    try {
      const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (decoded.exp && Date.now() > decoded.exp) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Generate an IDOR-preventing Order Ownership Access Token
   * Binds an orderId to the customer's normalized email and phone.
   */
  generateOrderAccessToken(orderId, email, phone) {
    const normalizedId = String(orderId || '').trim().toUpperCase();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').replace(/\s+/g, '');
    const data = `${normalizedId}|${normalizedEmail}|${normalizedPhone}`;

    return crypto.createHmac('sha256', this.orderSecret).update(data).digest('hex');
  }

  /**
   * Verify an Order Ownership Access Token in constant time to prevent IDOR
   */
  verifyOrderAccessToken(token, orderId, email, phone) {
    if (!token || typeof token !== 'string') return false;
    const expected = this.generateOrderAccessToken(orderId, email, phone);
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expected);
    if (tokenBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  }

  /**
   * Verify Paystack Webhook signature (x-paystack-signature header)
   */
  verifyPaystackSignature(rawBody, signatureHeader, secretKey = config.paystack.secretKey) {
    if (!signatureHeader) return false;
    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');
    const sigBuf = Buffer.from(String(signatureHeader));
    const hashBuf = Buffer.from(hash);
    if (sigBuf.length !== hashBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, hashBuf);
  }
}

export const cryptoService = new CryptoService();

