import { BaseValidator } from '../core/BaseValidator.js';

/**
 * Category & Category Page Validator Class (SOLID - SRP)
 */
export class CategoryValidator extends BaseValidator {
  static validateSaveCategory(body = {}) {
    return BaseValidator.validate(body, (data, errors) => {
      if (!BaseValidator.isNonEmptyString(data.name, 2, 100)) {
        errors.name = 'Category name is required (2-100 characters)';
      }

      if (data.slug !== undefined && !BaseValidator.isNonEmptyString(data.slug, 2, 100)) {
        errors.slug = 'Category slug must be between 2 and 100 characters';
      }

      if (data.description !== undefined && String(data.description).length > 1000) {
        errors.description = 'Category description cannot exceed 1000 characters';
      }

      if (data.position !== undefined && !BaseValidator.isPositiveInteger(Number(data.position))) {
        errors.position = 'Category position must be a positive integer';
      }
    });
  }
}

