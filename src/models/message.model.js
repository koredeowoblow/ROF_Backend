import mongoose from 'mongoose';

const MessageReplySubSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['Customer', 'Staff', 'Owner'], default: 'Owner' },
    replyText: { type: String, required: true, trim: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    orderId: {
      type: String,
      default: null,
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
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      default: 'General Inquiry',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    handled: {
      type: Boolean,
      default: false,
      index: true,
    },
    replies: {
      type: [MessageReplySubSchema],
      default: [],
    },
    createdAt: {
      type: String,
      default: () => new Date().toISOString(),
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MessageModel = mongoose.models.Message || mongoose.model('Message', MessageSchema);
