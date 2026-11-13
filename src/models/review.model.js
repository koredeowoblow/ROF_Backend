import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    productId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    productSlug: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    sizePurchased: {
      type: String,
      default: '',
      trim: true,
    },
    verifiedPurchase: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: String,
      default: () => new Date().toISOString(),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ReviewModel = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

