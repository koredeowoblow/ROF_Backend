import fs from 'node:fs';
import path from 'node:path';

// Load .env using Node built-in fs (works with or without dotenv installed)
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
} catch {
  // Ignore .env read errors in restricted environments
}

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rof_rage',
    options: {
      autoIndex: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    },
  },
  corsOrigins: (
    process.env.CORS_ORIGIN ||
    'http://localhost:5143,http://localhost:5173,http://localhost:3000,http://127.0.0.1:5143,http://127.0.0.1:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  rateLimit: {
    globalWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    globalMax: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '120', 10),
    authWindowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
    paymentWindowMs: parseInt(process.env.RATE_LIMIT_PAYMENT_WINDOW_MS || '600000', 10),
    paymentMax: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX || '20', 10),
    writeWindowMs: parseInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS || '600000', 10),
    writeMax: parseInt(process.env.RATE_LIMIT_WRITE_MAX || '15', 10),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'rof_rage_super_secret_jwt_signing_key_2026',
    jwtExpiresInMs: 24 * 60 * 60 * 1000, // 24 hours
    orderTokenSecret: process.env.ORDER_TOKEN_SECRET || 'rof_rage_idor_order_hmac_secret_2026',
    maxLoginAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'rof-rage-studio',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'rof_rage/products',
    maxFileSizeBytes: parseInt(process.env.CLOUDINARY_MAX_FILE_SIZE || String(10 * 1024 * 1024), 10), // 10MB
  },
  payment: {
    // Switch active online payment provider across the backend: 'paystack' | 'stripe' | 'flutterwave'
    defaultProvider: (process.env.PAYMENT_PROVIDER || 'paystack').trim().toLowerCase(),
    supportedProviders: ['paystack', 'stripe', 'flutterwave', 'bank_transfer', 'delivery'],
    onlineProviders: ['paystack', 'stripe', 'flutterwave'],
    bankDetails: {
      bankName: process.env.STUDIO_BANK_NAME || 'Providus Bank',
      accountName: process.env.STUDIO_BANK_ACCOUNT_NAME || 'ROF RAGE STUDIO LTD',
      accountNumber: process.env.STUDIO_BANK_ACCOUNT_NUMBER || '5401928374',
    },
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || 'sk_test_98a7192837491028475918274',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_1928374655647382910',
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
    webhookUrl:
      process.env.PAYSTACK_WEBHOOK_URL || 'https://rofrage.com/api/v1/payments/paystack/webhook',
    liveRequests: process.env.PAYSTACK_LIVE_REQUESTS === 'true',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_stripe_rof_rage_2026',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_stripe_rof_rage_2026',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_stripe_rof_rage_2026',
    currency: (process.env.STRIPE_CURRENCY || 'ngn').toLowerCase(),
    baseUrl: process.env.STRIPE_BASE_URL || 'https://api.stripe.com/v1',
    webhookUrl:
      process.env.STRIPE_WEBHOOK_URL || 'https://rofrage.com/api/v1/payments/stripe/webhook',
    liveRequests: process.env.STRIPE_LIVE_REQUESTS === 'true',
  },
  flutterwave: {
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-rof_rage_2026',
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-rof_rage_2026',
    encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY || 'FLWSECK_TEST_ENC_2026',
    webhookSecretHash:
      process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH || 'rof_rage_flutterwave_webhook_hash_2026',
    currency: (process.env.FLUTTERWAVE_CURRENCY || 'NGN').toUpperCase(),
    baseUrl: process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3',
    webhookUrl:
      process.env.FLUTTERWAVE_WEBHOOK_URL ||
      'https://rofrage.com/api/v1/payments/flutterwave/webhook',
    liveRequests: process.env.FLUTTERWAVE_LIVE_REQUESTS === 'true',
  },
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
});
