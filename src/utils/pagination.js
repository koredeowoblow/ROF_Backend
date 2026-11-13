import { config } from '../config/index.js';

/**
 * Reusable Pagination, MongoDB Filter & Sorting Engine (Class-Based, DRY & SRP)
 * Supports both MongoDB/Mongoose query building and in-memory array pagination.
 */
export class Paginator {
  /**
   * Normalize pagination parameters from Express req.query
   */
  static parseOptions(query = {}) {
    const rawPage = parseInt(query.page, 10);
    const rawLimit = parseInt(query.limit, 10);

    const page = Number.isNaN(rawPage) || rawPage < 1 ? config.pagination.defaultPage : rawPage;
    const limit =
      Number.isNaN(rawLimit) || rawLimit < 1
        ? config.pagination.defaultLimit
        : Math.min(rawLimit, config.pagination.maxLimit);

    const sortBy = typeof query.sortBy === 'string' && query.sortBy.trim() ? query.sortBy.trim() : null;
    const sortOrder =
      typeof query.sortOrder === 'string' && query.sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const search = typeof query.search === 'string' ? query.search.trim() : '';

    return {
      page,
      limit,
      offset: (page - 1) * limit,
      sortBy,
      sortOrder,
      search,
    };
  }

  /**
   * Build MongoDB sort object from pagination options
   */
  static buildMongoSort(options = {}, defaultSort = { createdAt: -1 }) {
    if (!options.sortBy) return defaultSort;
    const dir = options.sortOrder === 'asc' ? 1 : -1;
    return { [options.sortBy]: dir };
  }

  /**
   * Build MongoDB filter combining base filter criteria and regex search across searchFields
   */
  static buildMongoFilter(baseFilter = {}, search = '', searchFields = []) {
    const filter = { ...baseFilter };
    if (search && typeof search === 'string' && search.trim() && searchFields.length > 0) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      const searchOr = searchFields.map((field) => ({ [field]: regex }));
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }
    return filter;
  }

  /**
   * Build standardized pagination metadata object from total count, page, and limit
   */
  static buildMeta({ totalItems = 0, page = 1, limit = config.pagination.defaultLimit } = {}) {
    const safeLimit = Math.min(config.pagination.maxLimit, Math.max(1, Number(limit) || 20));
    const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));
    const safePage = Math.max(1, Math.min(Number(page) || 1, totalPages));

    return {
      page: safePage,
      limit: safeLimit,
      totalItems,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
      nextPage: safePage < totalPages ? safePage + 1 : null,
      prevPage: safePage > 1 ? safePage - 1 : null,
    };
  }

  /**
   * Paginate an in-memory array (used for computed aggregations like Customers ledger)
   */
  static paginateArray(items = [], options = {}, handlers = {}) {
    const parsed = {
      ...Paginator.parseOptions(options),
      ...options,
    };
    const page = Math.max(1, Number(parsed.page) || config.pagination.defaultPage);
    const limit = Math.min(
      config.pagination.maxLimit,
      Math.max(1, Number(parsed.limit) || config.pagination.defaultLimit)
    );

    let working = Array.isArray(items) ? [...items] : [];

    if (typeof handlers.filterFn === 'function') {
      working = working.filter(handlers.filterFn);
    }

    if (parsed.search && Array.isArray(handlers.searchFields) && handlers.searchFields.length > 0) {
      const q = parsed.search.toLowerCase();
      working = working.filter((item) =>
        handlers.searchFields.some((fieldPath) => {
          const val = Paginator.#getNestedValue(item, fieldPath);
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
        })
      );
    }

    if (parsed.sortBy) {
      const dir = parsed.sortOrder === 'asc' ? 1 : -1;
      working.sort((a, b) => {
        const valA = Paginator.#getNestedValue(a, parsed.sortBy);
        const valB = Paginator.#getNestedValue(b, parsed.sortBy);
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * dir;
        }
        return String(valA).localeCompare(String(valB)) * dir;
      });
    }

    const totalItems = working.length;
    const meta = Paginator.buildMeta({ totalItems, page, limit });
    const offset = (meta.page - 1) * meta.limit;
    const data = working.slice(offset, offset + meta.limit);

    return { data, meta };
  }

  static paginate(items = [], options = {}, handlers = {}) {
    return Paginator.paginateArray(items, options, handlers);
  }

  static #getNestedValue(obj, pathStr) {
    if (!obj || !pathStr) return undefined;
    return pathStr
      .split('.')
      .reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  }
}
