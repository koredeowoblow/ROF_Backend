import { ValidationError } from './AppError.js';

/**
 * Base Validator Class (SOLID - SRP, OCP & DRY)
 * Provides reusable validation primitives and throws structured ValidationError on failure.
 */
export class BaseValidator {
  /**
   * Run validation on a target payload and throw ValidationError if any field errors exist
   */
  static validate(payload, ruleRunner) {
    const errors = {};
    const safePayload = payload && typeof payload === 'object' ? payload : {};

    ruleRunner(safePayload, errors);

    if (Object.keys(errors).length > 0) {
      const firstMessage = Object.values(errors)[0];
      throw new ValidationError(`Validation failed: ${firstMessage}`, errors);
    }

    return safePayload;
  }

  static isNonEmptyString(val, minLen = 1, maxLen = 5000) {
    return typeof val === 'string' && val.trim().length >= minLen && val.trim().length <= maxLen;
  }

  static isValidEmail(val) {
    if (typeof val !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  }

  static isValidPhone(val) {
    if (typeof val !== 'string') return false;
    const cleaned = val.replace(/[\s()-]/g, '');
    return /^(\+?234|0)[789][01]\d{8}$/.test(cleaned) || /^\+?[0-9]{10,15}$/.test(cleaned);
  }

  static isPositiveInteger(val) {
    return typeof val === 'number' && Number.isInteger(val) && val > 0;
  }

  static isNonNegativeInteger(val) {
    return typeof val === 'number' && Number.isInteger(val) && val >= 0;
  }

  static isInEnum(val, allowedValues = []) {
    return allowedValues.includes(val);
  }
}

