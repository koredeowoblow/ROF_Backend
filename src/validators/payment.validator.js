import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Payment Gateway Validator Class (SOLID - SRP)
 */
export class PaymentValidator extends BaseValidator {
  static validateInitialize(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.orderId, 4, 40)) {
        errors.orderId = 'Valid orderId reference is required to initialize payment';
      }
      if (!BaseValidator.isValidEmail(data.email)) {
        errors.email = 'Valid customer email is required to initialize payment';
      }
      if (
        data.method !== undefined &&
        !BaseValidator.isInEnum(data.method, ['paystack', 'bank_transfer', 'delivery'])
      ) {
        errors.method = "Payment method must be 'paystack', 'bank_transfer', or 'delivery'";
      }
    });
  }
}

