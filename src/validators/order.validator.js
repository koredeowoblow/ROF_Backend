import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Order Domain Validator Class (SOLID - SRP)
 */
export class OrderValidator extends BaseValidator {
  static ALLOWED_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
  static ALLOWED_PAYMENT_METHODS = [
    'paystack',
    'stripe',
    'flutterwave',
    'flutter',
    'bank_transfer',
    'delivery',
  ];
  static ALLOWED_STATUSES = [
    'received',
    'confirmed',
    'packed',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'refunded',
  ];

  static validateCreateOrder(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      const customer = data.customer;
      if (!customer || typeof customer !== 'object') {
        errors.customer = 'Customer delivery coordinates are required';
      } else {
        if (!BaseValidator.isNonEmptyString(customer.name, 2, 100)) {
          errors['customer.name'] = 'Customer full name is required (min 2 characters)';
        }
        if (!BaseValidator.isValidPhone(customer.phone)) {
          errors['customer.phone'] = 'A valid Nigerian or international phone number is required';
        }
        if (!BaseValidator.isValidEmail(customer.email)) {
          errors['customer.email'] = 'A valid email address is required';
        }
        if (!BaseValidator.isNonEmptyString(customer.address, 5, 250)) {
          errors['customer.address'] = 'Street address is required (min 5 characters)';
        }
        if (!BaseValidator.isNonEmptyString(customer.city, 2, 80)) {
          errors['customer.city'] = 'City or town is required';
        }
        if (!BaseValidator.isNonEmptyString(customer.state, 2, 80)) {
          errors['customer.state'] = 'State is required';
        }
      }

      if (!Array.isArray(data.items) || data.items.length === 0) {
        errors.items = 'Order must contain at least one garment item';
      } else {
        data.items.forEach((item, index) => {
          if (!BaseValidator.isNonEmptyString(item?.productId, 1, 80)) {
            errors[`items[${index}].productId`] = 'Product ID is required for each order item';
          }
          const size = String(item?.size || '').toUpperCase();
          if (!BaseValidator.isInEnum(size, OrderValidator.ALLOWED_SIZES)) {
            errors[`items[${index}].size`] = `Size must be one of ${OrderValidator.ALLOWED_SIZES.join(', ')}`;
          }
          if (!BaseValidator.isPositiveInteger(Number(item?.qty))) {
            errors[`items[${index}].qty`] = 'Quantity must be a positive integer';
          }
        });
      }

      if (
        data.paymentMethod !== undefined &&
        !BaseValidator.isInEnum(data.paymentMethod, OrderValidator.ALLOWED_PAYMENT_METHODS)
      ) {
        errors.paymentMethod = `Payment method must be one of: ${OrderValidator.ALLOWED_PAYMENT_METHODS.join(', ')}`;
      }
    });
  }

  static validateTrackOrder(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.orderId, 4, 40)) {
        errors.orderId = 'Order reference (e.g. ROF-849102) is required';
      }
      const contact = data.contact || data.phoneOrEmail;
      if (!BaseValidator.isNonEmptyString(contact, 5, 120)) {
        errors.contact = 'Customer phone number or email address is required to verify ownership';
      }
    });
  }

  static validateStatusTransition(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isInEnum(data.status, OrderValidator.ALLOWED_STATUSES)) {
        errors.status = `Status must be one of: ${OrderValidator.ALLOWED_STATUSES.join(', ')}`;
      }
    });
  }

  static validateBulkTransition(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!Array.isArray(data.orderIds) || data.orderIds.length === 0) {
        errors.orderIds = 'orderIds must be a non-empty array of order references';
      }
      if (!BaseValidator.isInEnum(data.status, OrderValidator.ALLOWED_STATUSES)) {
        errors.status = `Status must be one of: ${OrderValidator.ALLOWED_STATUSES.join(', ')}`;
      }
    });
  }
}

