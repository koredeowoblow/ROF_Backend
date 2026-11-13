import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Payment Gateway Validator Class (SOLID - SRP)
 */
export class PaymentValidator extends BaseValidator {
  static ALLOWED_METHODS = [
    'paystack',
    'stripe',
    'flutterwave',
    'flutter',
    'bank_transfer',
    'delivery',
    'card',
    'online',
  ];

  static ALLOWED_PROVIDERS = ['paystack', 'stripe', 'flutterwave', 'flutter'];

  static validateInitialize(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.orderId, 4, 40)) {
        errors.orderId = 'Valid orderId reference is required to initialize payment';
      }
      if (data.email !== undefined && data.email !== '' && !BaseValidator.isValidEmail(data.email)) {
        errors.email = 'Valid customer email is required to initialize payment';
      }
      if (
        data.method !== undefined &&
        !BaseValidator.isInEnum(
          String(data.method).toLowerCase(),
          PaymentValidator.ALLOWED_METHODS
        )
      ) {
        errors.method =
          "Payment method must be 'paystack', 'stripe', 'flutterwave', 'bank_transfer', or 'delivery'";
      }
      if (
        data.provider !== undefined &&
        !BaseValidator.isInEnum(
          String(data.provider).toLowerCase(),
          PaymentValidator.ALLOWED_PROVIDERS
        )
      ) {
        errors.provider = "Payment provider must be 'paystack', 'stripe', or 'flutterwave'";
      }
    });
  }
}
