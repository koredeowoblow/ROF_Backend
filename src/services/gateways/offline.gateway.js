import { config } from '../../config/index.js';
import { PaymentGatewayStrategy } from './BaseGatewayService.js';

/**
 * Direct Studio Bank Transfer Strategy
 */
export class BankTransferGatewayStrategy extends PaymentGatewayStrategy {
  constructor() {
    super('bank_transfer', 'Direct Studio Bank Transfer');
  }

  async initialize({ orderId, amount, currency = 'NGN' }) {
    return {
      provider: 'bank_transfer',
      method: 'bank_transfer',
      reference: `bank_ref_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      authorizationUrl: null,
      accessCode: null,
      status: 'pending',
      amount: Number(amount),
      currency: String(currency).toUpperCase(),
      orderId,
      bankDetails: config.payment?.bankDetails || {
        bankName: 'Providus Bank',
        accountName: 'ROF RAGE STUDIO LTD',
        accountNumber: '5401928374',
      },
    };
  }

  getPublicConfig() {
    return {
      provider: 'bank_transfer',
      name: this.name,
      bankDetails: config.payment?.bankDetails,
      enabled: true,
    };
  }
}

/**
 * Pay on Delivery Strategy (Lagos Dispatch)
 */
export class DeliveryGatewayStrategy extends PaymentGatewayStrategy {
  constructor() {
    super('delivery', 'Pay on Delivery');
  }

  async initialize({ orderId, amount, currency = 'NGN' }) {
    return {
      provider: 'delivery',
      method: 'delivery',
      reference: `cod_ref_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      authorizationUrl: null,
      accessCode: null,
      status: 'pending',
      amount: Number(amount),
      currency: String(currency).toUpperCase(),
      orderId,
    };
  }

  getPublicConfig() {
    return {
      provider: 'delivery',
      name: this.name,
      lagosOnly: true,
      enabled: true,
    };
  }
}

