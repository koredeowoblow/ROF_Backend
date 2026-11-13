import { BaseValidator } from '../core/BaseValidator.js';
import { config } from '../config/index.js';

/**
 * Pagination Query Validator Class (SOLID - SRP)
 */
export class PaginationValidator extends BaseValidator {
  static validateQuery(query = {}) {
    return BaseValidator.validate(query, (data, errors) => {
      if (data.page !== undefined) {
        const page = Number(data.page);
        if (!Number.isInteger(page) || page < 1) {
          errors.page = 'Page must be a positive integer (>= 1)';
        }
      }

      if (data.limit !== undefined) {
        const limit = Number(data.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > config.pagination.maxLimit) {
          errors.limit = `Limit must be an integer between 1 and ${config.pagination.maxLimit}`;
        }
      }

      if (data.sortOrder !== undefined) {
        const order = String(data.sortOrder).toLowerCase();
        if (!['asc', 'desc'].includes(order)) {
          errors.sortOrder = "sortOrder must be either 'asc' or 'desc'";
        }
      }
    });
  }
}

