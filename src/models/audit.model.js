import mongoose from 'mongoose';

const AuditSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entity: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      default: '',
    },
    timestamp: {
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

export const AuditModel = mongoose.models.Audit || mongoose.model('Audit', AuditSchema);

