import { BaseDTO } from '../core/BaseDTO.js';

/**
 * Brand Content Configuration DTOs (Class-Based, SRP)
 */
export class ContentResponseDTO extends BaseDTO {
  constructor(content = {}) {
    super();
    this.brand = structuredClone(content.brand || {});
    this.delivery = structuredClone(content.delivery || {});
    this.contact = structuredClone(content.contact || {});
    this.help = structuredClone(content.help || {});
  }
}

export class UpdateContentRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    const picked = BaseDTO.pick(body, ['brand', 'delivery', 'contact', 'help']);
    if (picked.brand) this.brand = picked.brand;
    if (picked.delivery) this.delivery = picked.delivery;
    if (picked.contact) this.contact = picked.contact;
    if (picked.help) this.help = picked.help;
  }
}

