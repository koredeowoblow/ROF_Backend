import mongoose from 'mongoose';

const WishlistSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    productIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const WishlistModel =
  mongoose.models.Wishlist || mongoose.model('Wishlist', WishlistSchema);

