import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Product Review & Rating Validator Class (SOLID - SRP)
 */
export class ReviewValidator extends BaseValidator {
  static validateCreateReview(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      const rating = Number(data.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        errors.rating = 'Rating must be an integer between 1 and 5';
      }

      if (!BaseValidator.isNonEmptyString(data.comment, 3, 1500)) {
        errors.comment = 'Review comment is required (3-1500 characters)';
      }

      if (data.title !== undefined && String(data.title).length > 120) {
        errors.title = 'Review title cannot exceed 120 characters';
      }
    });
  }
}

