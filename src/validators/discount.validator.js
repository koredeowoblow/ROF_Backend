import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Discount Validator Class (SOLID - SRP)
 */
export class DiscountValidator extends BaseValidator {
  static validateCreateDiscount(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.code, 3, 30)) {
        errors.code = 'Discount code must be between 3 and 30 characters';
      }
      if (!BaseValidator.isInEnum(data.type, ['percentage', 'fixed'])) {
        errors.type = "Discount type must be either 'percentage' or 'fixed'";
      }
      const value = Number(data.value);
      if (Number.isNaN(value) || value <= 0) {
        errors.value = 'Discount value must be greater than 0';
      }
      if (data.type === 'percentage' && value > 100) {
        errors.value = 'Percentage discount cannot exceed 100%';
      }
      if (data.minOrder !== undefined && !BaseValidator.isNonNegativeInteger(Number(data.minOrder))) {
        errors.minOrder = 'Minimum order threshold must be a non-negative integer';
      }
    });
  }

  static validateApplyDiscount(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.code, 2, 30)) {
        errors.code = 'Discount voucher code is required';
      }
      if (data.subtotal !== undefined && Number(data.subtotal) < 0) {
        errors.subtotal = 'Subtotal must be a non-negative amount';
      }
    });
  }
}

