import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { RateLimiter } from '../middlewares/rateLimiter.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { MessageValidator } from '../validators/message.validator.js';
import { PaginationValidator } from '../validators/pagination.validator.js';

export function createMessageRoutes(messageController) {
  const router = Router();
  const writeRateLimit = RateLimiter.publicWrite();

  // Public or authenticated customer: submit a contact/order inquiry message
  router.post(
    '/',
    routeTryCatch(writeRateLimit),
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(ValidatorMiddleware.body(MessageValidator.validateCreateMessage)),
    routeTryCatch(messageController.sendContactMessage)
  );

  // Logged-in customer: view their own inquiries and studio replies (IDOR-isolated)
  router.get(
    '/my-messages',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(messageController.getMyMessages)
  );

  // Admin/Staff: list all inquiries
  router.get(
    '/',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(messageController.getAdminMessages)
  );

  // View single inquiry by ID (IDOR-guarded in MessageService: only inquiry owner or Admin/Staff)
  router.get(
    '/:id',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(messageController.getMessageById)
  );

  // Admin/Staff: reply to a customer inquiry
  router.post(
    '/:id/reply',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.body(MessageValidator.validateReplyMessage)),
    routeTryCatch(messageController.replyToMessage)
  );

  // Admin/Staff: toggle handled status
  router.patch(
    '/:id/toggle',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(messageController.toggleMessageHandled)
  );

  // Owner: delete an inquiry
  router.delete(
    '/:id',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(messageController.deleteMessage)
  );

  return router;
}

export function createNewsletterRoutes(newsletterController) {
  const router = Router();
  const writeRateLimit = RateLimiter.publicWrite();

  router.post(
    '/',
    routeTryCatch(writeRateLimit),
    routeTryCatch(ValidatorMiddleware.body(MessageValidator.validateNewsletter)),
    routeTryCatch(newsletterController.subscribe)
  );

  return router;
}
