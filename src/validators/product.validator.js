import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Product & Inventory Validator Class (SOLID - SRP)
 */
export class ProductValidator extends BaseValidator {
  static SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
  static GROUNDS = ['ink', 'bone'];

  static validateSaveProduct(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.name, 2, 120)) {
        errors.name = 'Piece name is required (2-120 characters)';
      }

      if (!BaseValidator.isNonEmptyString(data.colour, 2, 60)) {
        errors.colour = 'Colourway is required (2-60 characters)';
      }

      const price = Number(data.price);
      if (!BaseValidator.isPositiveInteger(price)) {
        errors.price = 'Price must be a positive integer in NGN';
      }

      if (!BaseValidator.isNonEmptyString(data.print, 3, 300)) {
        errors.print = 'Print specification is required (3-300 characters)';
      }

      if (!BaseValidator.isNonEmptyString(data.blurb, 5, 1000)) {
        errors.blurb = 'Blurb / story description is required (5-1000 characters)';
      }

      if (data.ground !== undefined && !BaseValidator.isInEnum(data.ground, ProductValidator.GROUNDS)) {
        errors.ground = "Ground must be either 'ink' or 'bone'";
      }

      if (data.variants !== undefined) {
        if (!Array.isArray(data.variants) || data.variants.length === 0) {
          errors.variants = 'Variants must be a non-empty array of size/stock objects';
        } else {
          for (const v of data.variants) {
            if (!BaseValidator.isInEnum(String(v?.size || '').toUpperCase(), ProductValidator.SIZES)) {
              errors.variants = `Each variant size must be one of: ${ProductValidator.SIZES.join(', ')}`;
              break;
            }
            if (!BaseValidator.isNonNegativeInteger(Number(v?.stock))) {
              errors.variants = 'Each variant stock must be a non-negative integer';
              break;
            }
          }
        }
      }
    });
  }

  static validateUpdateInventory(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.productId, 1, 80)) {
        errors.productId = 'productId is required';
      }

      const size = String(data.size || '').toUpperCase();
      if (!BaseValidator.isInEnum(size, ProductValidator.SIZES)) {
        errors.size = `Size must be one of: ${ProductValidator.SIZES.join(', ')}`;
      }

      const stockVal = Number(data.stock ?? data.newStock);
      if (!BaseValidator.isNonNegativeInteger(stockVal)) {
        errors.stock = 'Stock must be a non-negative integer (>= 0)';
      }
    });
  }
}

