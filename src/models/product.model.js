import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      enum: ['S', 'M', 'L', 'XL', 'XXL'],
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const CloudinaryAssetSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    format: {
      type: String,
      default: 'webp',
    },
    width: {
      type: Number,
      default: 1200,
    },
    height: {
      type: Number,
      default: 1500,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: String,
      default: 'cat-heavyweight-tees',
      index: true,
      trim: true,
    },
    categorySlug: {
      type: String,
      default: 'heavyweight-tees',
      index: true,
      lowercase: true,
      trim: true,
    },
    categoryName: {
      type: String,
      default: 'Heavyweight Tees',
      trim: true,
    },
    colour: {
      type: String,
      required: true,
      trim: true,
    },
    colourKey: {
      type: String,
      enum: ['green', 'white', 'black'],
      default: 'black',
      index: true,
    },
    swatch: {
      type: String,
      default: '#141312',
    },
    print: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    compareAtPrice: {
      type: Number,
      default: null,
    },
    blurb: {
      type: String,
      required: true,
      trim: true,
    },
    ground: {
      type: String,
      enum: ['ink', 'bone'],
      default: 'bone',
    },
    zoomOrigin: {
      type: String,
      default: '50% 50%',
    },
    thumbnailUrl: {
      type: String,
      default: '/images/placeholder.webp',
      trim: true,
    },
    images: {
      type: [String],
      default: ['/images/placeholder.webp'],
    },
    cloudinaryImages: {
      type: [CloudinaryAssetSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pairId: {
      type: String,
    },
    position: {
      type: Number,
      default: 1,
      index: true,
    },
    published: {
      type: Boolean,
      default: true,
      index: true,
    },
    variants: {
      type: [VariantSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);
