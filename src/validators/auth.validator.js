import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Customer & Admin Authentication Validator Class (SOLID - SRP)
 */
export class AuthValidator extends BaseValidator {
  static validateRegister(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.name, 2, 100)) {
        errors.name = 'Full name is required (2-100 characters)';
      }
      if (!BaseValidator.isValidEmail(data.email)) {
        errors.email = 'Valid email address is required';
      }
      if (!BaseValidator.isNonEmptyString(data.password, 6, 128)) {
        errors.password = 'Password must be at least 6 characters long';
      }
      if (data.phone && !BaseValidator.isValidPhone(data.phone)) {
        errors.phone = 'Valid phone number is required';
      }
    });
  }

  static validateCustomerLogin(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isValidEmail(data.email)) {
        errors.email = 'Valid email address is required';
      }
      if (!BaseValidator.isNonEmptyString(data.password, 1, 128)) {
        errors.password = 'Password is required';
      }
    });
  }

  static validateAdminLogin(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (data.email !== undefined && data.email !== '' && !BaseValidator.isValidEmail(data.email)) {
        errors.email = 'Valid admin email address is required';
      }
      if (!BaseValidator.isNonEmptyString(data.password, 1, 128)) {
        errors.password = 'Studio password is required';
      }
    });
  }

  static validateLogin(body = {}) {
    return AuthValidator.validateAdminLogin(body);
  }
}
