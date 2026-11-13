import { ResponseHandler } from '../utils/responseHandler.js';
import { Paginator } from '../utils/pagination.js';
import { PaginationRequestDTO } from '../dtos/pagination.dto.js';

/**
 * Abstract Base Controller (SOLID - SRP, OCP, DIP & DRY)
 * Auto-binds prototype methods so `this` is preserved in Express routes
 * and delegates HTTP formatting to ResponseHandler.
 * No repetitive try/catch blocks inside controllers — handled cleanly at the route level.
 */
export class BaseController {
  constructor(service = null) {
    if (new.target === BaseController) {
      throw new Error('BaseController is abstract and cannot be instantiated directly');
    }
    this.service = service;
    this.#bindMethods();
  }

  /**
   * Automatically bind all subclass prototype methods to `this` instance (DRY)
   */
  #bindMethods() {
    let proto = Object.getPrototypeOf(this);
    while (proto && proto !== BaseController.prototype && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key !== 'constructor' && typeof this[key] === 'function') {
          this[key] = this[key].bind(this);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
  }

  /**
   * Extract validated & normalized PaginationRequestDTO from req.query
   */
  getPaginationParams(req) {
    const parsed = Paginator.parseOptions(req.query);
    return PaginationRequestDTO.fromQuery({ ...req.query, ...parsed });
  }

  /**
   * Standard response helpers delegating to ResponseHandler
   */
  ok(res, data, message = 'Success', meta = null, headers = {}) {
    return ResponseHandler.success(res, { data, message, statusCode: 200, meta, headers });
  }

  created(res, data, message = 'Resource created successfully', meta = null, headers = {}) {
    return ResponseHandler.created(res, { data, message, meta, headers });
  }

  paginated(res, { data, meta }, message = 'Records retrieved successfully', headers = {}) {
    return ResponseHandler.paginated(res, { data, pagination: meta, message, headers });
  }

  noContent(res) {
    return ResponseHandler.noContent(res);
  }
}
