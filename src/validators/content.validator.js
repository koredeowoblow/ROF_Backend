import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Brand Content Configuration Validator Class (SOLID - SRP)
 */
export class ContentValidator extends BaseValidator {
  static validateUpdateContent(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      const hasSection = data.brand || data.delivery || data.contact || data.help;
      if (!hasSection) {
        errors.content = 'At least one content section (brand, delivery, contact, or help) is required';
      }

      if (data.delivery) {
        if (
          data.delivery.lagosFee?.value !== undefined &&
          !BaseValidator.isNonNegativeInteger(Number(data.delivery.lagosFee.value))
        ) {
          errors['delivery.lagosFee'] = 'Lagos delivery fee must be a non-negative integer in NGN';
        }
        if (
          data.delivery.interstateFee?.value !== undefined &&
          !BaseValidator.isNonNegativeInteger(Number(data.delivery.interstateFee.value))
        ) {
          errors['delivery.interstateFee'] =
            'Interstate delivery fee must be a non-negative integer in NGN';
        }
      }
    });
  }
}

