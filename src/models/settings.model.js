import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: 'global-settings',
      unique: true,
      index: true,
    },
    paystackSecretKeyMasked: {
      type: String,
      default: 'sk_test_********************8274',
    },
    paystackWebhookUrl: {
      type: String,
      default: 'https://rofrage.com/api/v1/payments/paystack/webhook',
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    criticalStockThreshold: {
      type: Number,
      default: 5,
    },
    bankAccount: {
      bankName: { type: String, default: 'Guaranty Trust Bank (GTBank)' },
      accountName: { type: String, default: 'ROF RAGE CLOTHING LTD' },
      accountNumber: { type: String, default: '0819203912' },
    },
    updatedAt: {
      type: String,
      default: () => new Date().toISOString(),
    },
  },
  {
    versionKey: false,
  }
);

export const SettingsModel =
  mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

