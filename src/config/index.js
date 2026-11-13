import dotenv from 'dotenv';

dotenv.config();

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
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim()),
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
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || 'sk_test_98a7192837491028475918274',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_1928374655647382910',
    webhookUrl:
      process.env.PAYSTACK_WEBHOOK_URL || 'https://rofrage.com/api/v1/payments/paystack/webhook',
  },
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100,
  },
});
