import { BaseDTO } from '../core/BaseDTO.js';

/**
 * Discount & Voucher Domain DTOs (Class-Based, SRP)
 */
export class DiscountResponseDTO extends BaseDTO {
  constructor(discount = {}) {
    super();
    this.id = discount.id;
    this.code = String(discount.code || '').toUpperCase();
    this.type = discount.type;
    this.value = Number(discount.value);
    this.minOrder = Number(discount.minOrder || 0);
    if (discount.expiresAt) this.expiresAt = discount.expiresAt;
    if (discount.usageLimit !== undefined) this.usageLimit = Number(discount.usageLimit);
    this.usedCount = Number(discount.usedCount || 0);
    this.active = Boolean(discount.active);
  }
}

export class CreateDiscountRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.id = body.id ? String(body.id).trim() : `disc-${Date.now()}`;
    this.code = String(body.code || '').trim().toUpperCase();
    this.type = body.type === 'fixed' ? 'fixed' : 'percentage';
    this.value = Number(body.value || 0);
    this.minOrder = Number(body.minOrder || 0);
    this.expiresAt = body.expiresAt ? String(body.expiresAt) : undefined;
    this.usageLimit = body.usageLimit !== undefined ? Number(body.usageLimit) : undefined;
    this.active = body.active !== undefined ? Boolean(body.active) : true;
  }
}

export class ValidateDiscountRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.code = String(body.code || '').trim().toUpperCase();
    this.subtotal = Number(body.subtotal || 0);
  }
}

