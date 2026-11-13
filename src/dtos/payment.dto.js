import { BaseDTO } from '../core/BaseDTO.js';

/**
 * Payment Domain DTOs (Class-Based, SRP)
 */
export class InitializePaymentRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.orderId = String(body.orderId || '').trim().toUpperCase();
    this.email = String(body.email || '').trim().toLowerCase();
    this.phone = body.phone ? String(body.phone).trim() : '';
    this.method = body.method || 'paystack';
    this.callbackUrl = body.callbackUrl ? String(body.callbackUrl).trim() : undefined;
  }
}

export class PaymentInitializedResponseDTO extends BaseDTO {
  constructor(result = {}) {
    super();
    this.reference = result.reference;
    this.authorization_url = result.authorizationUrl || result.authorization_url;
    this.authorizationUrl = result.authorizationUrl || result.authorization_url;
    this.access_code = result.accessCode || `code_${Date.now()}`;
    this.status = result.status || 'pending';
    this.amount = result.amount;
    this.orderId = result.orderId;
  }
}

