import mongoose from 'mongoose';

const ContentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: 'brand-content',
      unique: true,
      index: true,
    },
    brand: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    delivery: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    contact: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    help: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ContentModel = mongoose.models.Content || mongoose.model('Content', ContentSchema);

