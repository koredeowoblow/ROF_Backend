import { BaseDTO } from '../core/BaseDTO.js';
import { config } from '../config/index.js';

/**
 * Pagination Request & Metadata DTOs (Class-Based, SRP & DRY)
 */
export class PaginationRequestDTO extends BaseDTO {
  constructor(query = {}) {
    super();
    const rawPage = parseInt(query.page, 10);
    const rawLimit = parseInt(query.limit, 10);

    this.page = Number.isNaN(rawPage) || rawPage < 1 ? config.pagination.defaultPage : rawPage;
    this.limit =
      Number.isNaN(rawLimit) || rawLimit < 1
        ? config.pagination.defaultLimit
        : Math.min(rawLimit, config.pagination.maxLimit);
    this.offset = (this.page - 1) * this.limit;
    this.sortBy = typeof query.sortBy === 'string' && query.sortBy.trim() ? query.sortBy.trim() : null;
    this.sortOrder =
      typeof query.sortOrder === 'string' && query.sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    this.search = typeof query.search === 'string' ? query.search.trim() : '';
    this.status = typeof query.status === 'string' ? query.status.trim() : undefined;
    this.published =
      query.published !== undefined ? String(query.published).toLowerCase() === 'true' : undefined;
  }

  static fromQuery(query = {}) {
    return new PaginationRequestDTO(query).toJSON();
  }
}

export class PaginationMetaDTO extends BaseDTO {
  constructor(meta = {}) {
    super();
    this.page = Number(meta.page ?? 1);
    this.limit = Number(meta.limit ?? config.pagination.defaultLimit);
    this.totalItems = Number(meta.totalItems ?? 0);
    this.totalPages = Number(meta.totalPages ?? 1);
    this.hasNextPage = Boolean(meta.hasNextPage);
    this.hasPrevPage = Boolean(meta.hasPrevPage);
    this.nextPage = meta.nextPage ?? null;
    this.prevPage = meta.prevPage ?? null;
  }
}

