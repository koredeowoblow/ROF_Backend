import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      trim: true,
      default: '',
    },
    state: {
      type: String,
      trim: true,
      default: 'Lagos',
    },
    role: {
      type: String,
      enum: ['Customer', 'Staff', 'Owner'],
      default: 'Customer',
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    failedAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Number,
      default: null,
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

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
