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
   * Verify Paystack Webhook signature (x-paystack-signature header, HMAC-SHA512)
   */
  verifyPaystackSignature(rawBody, signatureHeader, secretKey = config.paystack.secretKey) {
    if (!signatureHeader) return false;
    const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const hash = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');
    const sigBuf = Buffer.from(String(signatureHeader));
    const hashBuf = Buffer.from(hash);
    if (sigBuf.length !== hashBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, hashBuf);
  }

  /**
   * Verify Stripe Webhook signature (stripe-signature header, HMAC-SHA256)
   * Supports both `t=<timestamp>,v1=<sig>` format and direct HMAC-SHA256 hex digest.
   */
  verifyStripeSignature(rawBody, signatureHeader, webhookSecret = config.stripe.webhookSecret) {
    if (!signatureHeader) return false;
    const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const sigStr = String(signatureHeader).trim();

    if (sigStr.includes('v1=')) {
      const parts = Object.fromEntries(
        sigStr.split(',').map((kv) => {
          const idx = kv.indexOf('=');
          return idx === -1 ? [kv.trim(), ''] : [kv.slice(0, idx).trim(), kv.slice(idx + 1).trim()];
        })
      );
      const timestamp = parts.t || '';
      const candidateSig = parts.v1 || '';
      if (!candidateSig) return false;

      const signedPayload = timestamp ? `${timestamp}.${payload}` : payload;
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedPayload)
        .digest('hex');
      const sigBuf = Buffer.from(candidateSig);
      const expBuf = Buffer.from(expected);
      if (sigBuf.length !== expBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expBuf);
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
    const sigBuf = Buffer.from(sigStr);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  /**
   * Verify Flutterwave Webhook signature (`verif-hash` or `flutterwave-signature` header)
   */
  verifyFlutterwaveSignature(
    rawBody,
    signatureHeader,
    secretHash = config.flutterwave.webhookSecretHash
  ) {
    if (!signatureHeader) return false;
    const sigStr = String(signatureHeader).trim();
    const secretStr = String(secretHash).trim();

    // 1. Direct secret hash match (`verif-hash` header standard in Flutterwave v3)
    const sigBuf = Buffer.from(sigStr);
    const secBuf = Buffer.from(secretStr);
    if (sigBuf.length === secBuf.length && crypto.timingSafeEqual(sigBuf, secBuf)) {
      return true;
    }

    // 2. Fallback: HMAC-SHA256 hex or base64 signature verification
    const payload = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    const expectedHex = crypto.createHmac('sha256', secretStr).update(payload).digest('hex');
    const hexBuf = Buffer.from(expectedHex);
    if (sigBuf.length === hexBuf.length && crypto.timingSafeEqual(sigBuf, hexBuf)) {
      return true;
    }

    const expectedBase64 = crypto.createHmac('sha256', secretStr).update(payload).digest('base64');
    const b64Buf = Buffer.from(expectedBase64);
    if (sigBuf.length === b64Buf.length && crypto.timingSafeEqual(sigBuf, b64Buf)) {
      return true;
    }

    return false;
  }
}

export const cryptoService = new CryptoService();

