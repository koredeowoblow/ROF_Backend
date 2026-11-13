import { BaseDTO } from '../core/BaseDTO.js';
import { ProductResponseDTO } from './product.dto.js';

/**
 * Customer Wishlist DTO (Class-Based, SRP)
 */
export class WishlistResponseDTO extends BaseDTO {
  constructor({ userId, productIds = [], products = [] }) {
    super();
    this.userId = String(userId);
    this.productIds = Array.isArray(productIds) ? productIds.map(String) : [];
    this.count = this.productIds.length;
    this.products = ProductResponseDTO.fromEntities(products);
  }
}

