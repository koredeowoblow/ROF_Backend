import mongoose from 'mongoose';

const CustomerSubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const OrderItemSubSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    colour: { type: String, required: true },
    size: { type: String, enum: ['S', 'M', 'L', 'XL', 'XXL'], required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    image: { type: String, default: '/images/placeholder.webp' },
  },
  { _id: false }
);

const OrderHistorySubSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'received',
        'confirmed',
        'packed',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded',
      ],
      required: true,
    },
    timestamp: { type: String, required: true },
    note: { type: String },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    customer: {
      type: CustomerSubSchema,
      required: true,
    },
    items: {
      type: [OrderItemSubSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    payment: {
      method: {
        type: String,
        enum: ['paystack', 'stripe', 'flutterwave', 'bank_transfer', 'delivery'],
        required: true,
      },
      provider: {
        type: String,
        enum: ['paystack', 'stripe', 'flutterwave', 'bank_transfer', 'delivery'],
        default: 'paystack',
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
      },
      reference: {
        type: String,
        required: true,
        index: true,
      },
      paidAt: {
        type: String,
        default: null,
      },
    },
    status: {
      type: String,
      enum: [
        'received',
        'confirmed',
        'packed',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'refunded',
      ],
      default: 'received',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    internalNotes: {
      type: String,
      default: '',
      trim: true,
    },
    courier: {
      type: String,
      trim: true,
    },
    trackingNumber: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: String,
      default: () => new Date().toISOString(),
      index: true,
    },
    history: {
      type: [OrderHistorySubSchema],
      default: [],
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);
