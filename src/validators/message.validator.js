import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Contact Message, Reply & Newsletter Validator Class (SOLID - SRP)
 */
export class MessageValidator extends BaseValidator {
  static validateCreateMessage(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.name, 2, 100)) {
        errors.name = 'Name is required (2-100 characters)';
      }
      if (!BaseValidator.isValidEmail(data.email)) {
        errors.email = 'Valid email address is required';
      }
      if (data.phone && !BaseValidator.isValidPhone(data.phone)) {
        errors.phone = 'Phone number format is invalid';
      }
      if (!BaseValidator.isNonEmptyString(data.message, 5, 2000)) {
        errors.message = 'Message must be between 5 and 2000 characters';
      }
    });
  }

  static validateReplyMessage(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      const text = data.replyText || data.message;
      if (!BaseValidator.isNonEmptyString(text, 2, 2000)) {
        errors.replyText = 'Reply message text is required (2-2000 characters)';
      }
    });
  }

  static validateNewsletter(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isValidEmail(data.email)) {
        errors.email = 'A valid email address is required to join the ROF list';
      }
    });
  }
}
