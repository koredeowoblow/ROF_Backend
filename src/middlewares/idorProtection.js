import { AppError } from '../core/AppError.js';
import { cryptoService } from '../utils/crypto.js';

/**
 * Class-Based IDOR (Insecure Direct Object Reference) Protection Middleware & Policy Guard (SOLID - SRP)
 *
 * Protects against IDOR and Mass-Assignment across 4 dimensions:
 * 1. Mass Assignment / Ownership Tampering Guard: Strips server-controlled and privilege fields
 *    (e.g. role, isAdmin, subtotal, total, fee, discount, payment.status, usedCount, ownerId)
 * 2. Parameter Reference Validation: Prevents path traversal, wildcard enumeration, and malformed IDs
 * 3. Resource Ownership Verification: Verifies that requests for specific orders (GET /orders/:id, GET /orders/track/:id)
 *    belong to the logged-in user (order.userId === req.user.id), carry a valid cryptographic Order Ownership Token
 *    (X-Order-Access-Token), provide matching customer contact, or are requested by an authenticated Admin/Staff.
 * 4. Visibility & Role Scope Enforcement: Blocks horizontal privilege escalation across user accounts.
 */
export class IdorProtection {
  /**
   * Privileged fields that untrusted clients must NEVER overwrite via mass assignment
   */
  static PROTECTED_BODY_FIELDS = new Set([
    'role',
    'roles',
    'isAdmin',
    'permissions',
    'userId',
    'ownerId',
    'createdBy',
    'subtotal',
    'total',
    'fee',
    'discount',
    'usedCount',
    'history',
    'passwordHash',
  ]);

  /**
   * 1. Global middleware that strips mass-assignment / privilege escalation fields on public routes
   *    and validates route parameter formats against traversal/injection.
   */
  static preventMassAssignmentAndTraversal(extraProtectedFields = []) {
    const protectedSet = new Set([...IdorProtection.PROTECTED_BODY_FIELDS, ...extraProtectedFields]);

    return (req, res, next) => {
      if (req.params && typeof req.params === 'object') {
        for (const [paramName, paramVal] of Object.entries(req.params)) {
          if (typeof paramVal === 'string') {
            if (
              paramVal.includes('..') ||
              paramVal.includes('/') ||
              paramVal.includes('\\') ||
              paramVal.includes('*') ||
              paramVal.length > 128
            ) {
              throw AppError.idor(`Invalid or unsafe resource identifier in parameter '${paramName}'`);
            }
          }
        }
      }

      const isOwner = req.user && req.user.role === 'Owner';
      if (!isOwner && req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        for (const key of Object.keys(req.body)) {
          if (protectedSet.has(key)) {
            delete req.body[key];
          }
        }
        if (req.body.payment && typeof req.body.payment === 'object') {
          delete req.body.payment.status;
        }
      }

      next();
    };
  }

  /**
   * 2. Verify ownership of an Order before allowing direct read/tracking by :id (Prevents Order IDOR)
   * Wrapped at the route level with routeTryCatch.
   */
  static verifyOrderOwnership(orderRepository) {
    return async (req, res, next) => {
      // Admin / Staff have authorized ledger access
      if (req.user && (req.user.role === 'Owner' || req.user.role === 'Staff')) {
        return next();
      }

      const orderId = req.params.id || req.body?.orderId;
      if (!orderId) {
        throw AppError.badRequest('Order reference is required');
      }

      const order = await orderRepository.findById(orderId.trim().toUpperCase());
      if (!order) {
        throw AppError.notFound('Order', orderId);
      }

      let isOwner = false;

      // Check 1: Logged-in customer account ownership (order.userId === req.user.id or matching email)
      if (req.user) {
        const userIdMatch = order.userId && String(order.userId) === String(req.user.id);
        const userEmailMatch =
          req.user.email && order.customer?.email?.toLowerCase() === req.user.email.toLowerCase();
        isOwner = Boolean(userIdMatch || userEmailMatch);
      }

      // Check 2: Cryptographic HMAC Order Ownership Access Token
      const accessToken =
        req.headers['x-order-access-token'] ||
        req.query?.accessToken ||
        req.body?.accessToken;

      if (!isOwner && accessToken) {
        isOwner = cryptoService.verifyOrderAccessToken(
          String(accessToken),
          order.id,
          order.customer.email,
          order.customer.phone
        );
      }

      // Check 3: Explicit matching customer contact (email or phone)
      const contact =
        req.headers['x-customer-contact'] ||
        req.query?.contact ||
        req.body?.contact ||
        req.body?.email;

      if (!isOwner && contact) {
        const cleanContact = String(contact).trim().toLowerCase();
        const emailMatch = order.customer.email.toLowerCase() === cleanContact;
        const phoneMatch =
          order.customer.phone.replace(/\s+/g, '') === cleanContact.replace(/\s+/g, '');
        isOwner = emailMatch || phoneMatch;
      }

      if (!isOwner) {
        throw AppError.idor(
          'IDOR Protection: You must be logged in as the order owner or provide a valid order access token/customer contact to access this order'
        );
      }

      req.scopedOrder = order;
      next();
    };
  }

  /**
   * 3. Prevent horizontal privilege escalation on user/customer/staff profiles
   */
  static verifySelfOrOwner(paramKey = 'id') {
    return (req, res, next) => {
      if (!req.user) {
        throw AppError.unauthorized();
      }
      const targetId = req.params[paramKey];
      if (req.user.role === 'Owner' || String(req.user.id) === String(targetId)) {
        return next();
      }
      throw AppError.idor('IDOR Protection: You cannot access or modify another user account');
    };
  }
}
