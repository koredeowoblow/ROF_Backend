import mongoose from 'mongoose';

const NewsletterSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    subscribedAt: {
      type: String,
      default: () => new Date().toISOString(),
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const NewsletterModel =
  mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema);

