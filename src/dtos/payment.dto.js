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
    this.method = body.method ? String(body.method).trim().toLowerCase() : undefined;
    this.provider = body.provider ? String(body.provider).trim().toLowerCase() : undefined;
    this.currency = body.currency ? String(body.currency).trim().toUpperCase() : undefined;
    this.callbackUrl = body.callbackUrl ? String(body.callbackUrl).trim() : undefined;
  }
}

export class PaymentInitializedResponseDTO extends BaseDTO {
  constructor(result = {}) {
    super();
    this.provider = result.provider || result.method || 'paystack';
    this.method = result.method || result.provider || 'paystack';
    this.reference = result.reference;
    this.authorization_url = result.authorizationUrl ?? result.authorization_url ?? null;
    this.authorizationUrl = result.authorizationUrl ?? result.authorization_url ?? null;
    this.access_code =
      result.accessCode !== undefined ? result.accessCode : `code_${Date.now()}`;
    this.accessCode =
      result.accessCode !== undefined ? result.accessCode : `code_${Date.now()}`;
    this.status = result.status || 'pending';
    this.amount = result.amount;
    this.currency = result.currency || 'NGN';
    this.orderId = result.orderId;
    if (result.publicKey) {
      this.publicKey = result.publicKey;
    }
    if (result.sessionId) {
      this.sessionId = result.sessionId;
    }
    if (result.txRef) {
      this.txRef = result.txRef;
    }
    if (result.bankDetails) {
      this.bankDetails = result.bankDetails;
    }
  }
}
