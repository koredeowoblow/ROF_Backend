import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    headline: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    bannerImage: {
      type: String,
      default: '/images/placeholder.webp',
      trim: true,
    },
    bannerPublicId: {
      type: String,
      default: '',
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    position: {
      type: Number,
      default: 1,
      index: true,
    },
    metaTitle: {
      type: String,
      default: '',
      trim: true,
    },
    metaDescription: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const CategoryModel =
  mongoose.models.Category || mongoose.model('Category', CategorySchema);

