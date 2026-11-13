import mongoose from 'mongoose';

const IdempotencySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // Automatically expire idempotency records after 24 hours in MongoDB
    },
  },
  {
    versionKey: false,
  }
);

export const IdempotencyModel =
  mongoose.models.Idempotency || mongoose.model('Idempotency', IdempotencySchema);

