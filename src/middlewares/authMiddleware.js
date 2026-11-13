import { AppError } from '../core/AppError.js';
import { cryptoService } from '../utils/crypto.js';

/**
 * Class-Based Authentication & Role-Based Access Control (RBAC) Middleware (SOLID - SRP)
 */
export class AuthMiddleware {
  /**
   * Require a valid Bearer token or x-admin-token header
   */
  static authenticate(req, res, next) {
    const token = AuthMiddleware.#extractToken(req);
    if (!token) {
      throw AppError.unauthorized('Authentication token is required');
    }

    const decoded = cryptoService.verifyToken(token);
    if (!decoded) {
      throw AppError.unauthorized('Invalid or expired authentication token');
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
    next();
  }

  /**
   * Attach req.user if a valid token is present, but allow unauthenticated requests to proceed
   */
  static optionalAuth(req, res, next) {
    const token = AuthMiddleware.#extractToken(req);
    if (token) {
      const decoded = cryptoService.verifyToken(token);
      if (decoded) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
        };
      }
    }
    next();
  }

  /**
   * Restrict route access to specific roles (e.g. 'Owner', 'Staff')
   */
  static authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        throw AppError.unauthorized('Authentication required');
      }
      if (!allowedRoles.includes(req.user.role)) {
        throw AppError.forbidden(
          `Access denied: role '${req.user.role}' is not permitted. Required: ${allowedRoles.join(' or ')}`
        );
      }
      next();
    };
  }

  static #extractToken(req) {
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    if (req.headers?.['x-admin-token']) {
      return String(req.headers['x-admin-token']).trim();
    }
    return null;
  }
}
