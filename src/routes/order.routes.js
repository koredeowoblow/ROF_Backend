import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { IdorProtection } from '../middlewares/idorProtection.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { OrderValidator } from '../validators/order.validator.js';
import { PaginationValidator } from '../validators/pagination.validator.js';

export function createOrderRoutes(orderController, orderRepository) {
  const router = Router();

  // Create new order (binds req.user.id if customer is logged in, recalculates prices, enforces idempotency & issues IDOR token)
  router.post(
    '/',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(ValidatorMiddleware.body(OrderValidator.validateCreateOrder)),
    routeTryCatch(orderController.createOrder)
  );

  // Logged-in customer's own order history & tracking list (IDOR-isolated to req.user.id)
  router.get(
    '/my-orders',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(orderController.getMyOrders)
  );

  // Track order by orderId + customer email/phone OR logged-in customer session (IDOR-safe)
  router.post(
    '/track',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(ValidatorMiddleware.body(OrderValidator.validateTrackOrder)),
    routeTryCatch(orderController.trackOrder)
  );

  // Track order directly by ID (protected by IDOR Ownership Guard: requires logged-in owner, X-Order-Access-Token, or matching contact)
  router.get(
    '/track/:id',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(IdorProtection.verifyOrderOwnership(orderRepository)),
    routeTryCatch(orderController.trackOrderById)
  );

  // Get single order by ID — protected by IDOR Ownership Guard
  router.get(
    '/:id',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(IdorProtection.verifyOrderOwnership(orderRepository)),
    routeTryCatch(orderController.getOrderById)
  );

  return router;
}
