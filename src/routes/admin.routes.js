import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { UploadMiddleware } from '../middlewares/uploadMiddleware.js';
import { PaginationValidator } from '../validators/pagination.validator.js';
import { AuthValidator } from '../validators/auth.validator.js';
import { OrderValidator } from '../validators/order.validator.js';
import { ProductValidator } from '../validators/product.validator.js';
import { CategoryValidator } from '../validators/category.validator.js';
import { DiscountValidator } from '../validators/discount.validator.js';
import { ContentValidator } from '../validators/content.validator.js';
import { MessageValidator } from '../validators/message.validator.js';

/**
 * Administrative Studio Routes (/api/v1/admin/*)
 * Includes Admin Studio Login/Logout + Cloudinary Upload + RBAC-protected ('Owner' vs 'Staff') studio operations.
 */
export function createAdminRoutes({
  adminController,
  orderController,
  productController,
  categoryController,
  reviewController,
  discountController,
  messageController,
  contentController,
}) {
  const router = Router();

  // Public Admin Studio Login endpoint (/api/v1/admin/login)
  router.post(
    '/login',
    routeTryCatch(ValidatorMiddleware.body(AuthValidator.validateAdminLogin)),
    routeTryCatch(adminController.login)
  );

  // Admin Studio Logout endpoint (/api/v1/admin/logout)
  router.post(
    '/logout',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(adminController.logout)
  );

  // All subsequent /admin routes require authentication
  router.use(routeTryCatch(AuthMiddleware.authenticate));

  // Overview KPIs (Owner & Staff)
  router.get(
    '/overview',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(adminController.getOverview)
  );

  // Cloudinary Direct Media Upload & Signed Upload Signature (Owner & Staff)
  router.get(
    '/upload/signature',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(productController.getCloudinarySignature)
  );

  router.post(
    '/upload',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(UploadMiddleware.parseImages()),
    routeTryCatch(productController.uploadMediaToCloudinary)
  );

  // Orders Ledger (Owner & Staff)
  router.get(
    '/orders',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(orderController.getAdminOrders)
  );

  router.get(
    '/orders/:id',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(orderController.getOrderById)
  );

  router.post(
    '/orders/:id/transition',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.body(OrderValidator.validateStatusTransition)),
    routeTryCatch(orderController.transitionOrderStatus)
  );

  router.patch(
    '/orders/:id',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.body(OrderValidator.validateStatusTransition)),
    routeTryCatch(orderController.transitionOrderStatus)
  );

  router.patch(
    '/orders',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.body(OrderValidator.validateBulkTransition)),
    routeTryCatch(orderController.bulkTransitionOrderStatus)
  );

  // Inventory & Products Management (with Cloudinary image uploads)
  router.get(
    '/inventory',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(productController.getProducts)
  );

  router.patch(
    '/inventory',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.body(ProductValidator.validateUpdateInventory)),
    routeTryCatch(productController.updateInventory)
  );

  router.post(
    '/products',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(UploadMiddleware.parseImages()),
    routeTryCatch(ValidatorMiddleware.body(ProductValidator.validateSaveProduct)),
    routeTryCatch(productController.saveProduct)
  );

  router.put(
    '/products/:id',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(UploadMiddleware.parseImages()),
    routeTryCatch(ValidatorMiddleware.body(ProductValidator.validateSaveProduct)),
    routeTryCatch(productController.saveProduct)
  );

  router.post(
    '/products/:id/images',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(UploadMiddleware.parseImages()),
    routeTryCatch(productController.uploadProductImages)
  );

  router.delete(
    '/products/:id/images',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(productController.deleteProductImage)
  );

  // Categories Management (Owner & Staff view, Owner create/update/delete)
  if (categoryController) {
    router.get(
      '/categories',
      routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
      routeTryCatch(categoryController.getCategories)
    );

    router.post(
      '/categories',
      routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
      routeTryCatch(UploadMiddleware.parseImages({ maxFiles: 1 })),
      routeTryCatch(ValidatorMiddleware.body(CategoryValidator.validateSaveCategory)),
      routeTryCatch(categoryController.saveCategory)
    );

    router.put(
      '/categories/:id',
      routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
      routeTryCatch(UploadMiddleware.parseImages({ maxFiles: 1 })),
      routeTryCatch(ValidatorMiddleware.body(CategoryValidator.validateSaveCategory)),
      routeTryCatch(categoryController.saveCategory)
    );

    router.delete(
      '/categories/:id',
      routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
      routeTryCatch(categoryController.deleteCategory)
    );
  }

  // Review Moderation
  if (reviewController) {
    router.delete(
      '/reviews/:id',
      routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
      routeTryCatch(reviewController.deleteReview)
    );
  }

  // Customers Directory (Owner & Staff)
  router.get(
    '/customers',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(adminController.getCustomers)
  );

  // Messages Inbox (Owner & Staff)
  router.get(
    '/messages',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(messageController.getAdminMessages)
  );

  router.get(
    '/messages/:id',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(messageController.getMessageById)
  );

  router.post(
    '/messages/:id/reply',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.body(MessageValidator.validateReplyMessage)),
    routeTryCatch(messageController.replyToMessage)
  );

  router.patch(
    '/messages/:id/toggle',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(messageController.toggleMessageHandled)
  );

  router.delete(
    '/messages/:id',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(messageController.deleteMessage)
  );

  // Content Manager (Owner only)
  router.get(
    '/content',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(contentController.getContent)
  );

  router.put(
    '/content',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(ValidatorMiddleware.body(ContentValidator.validateUpdateContent)),
    routeTryCatch(contentController.updateContent)
  );

  // Discounts (Owner only for creation)
  router.get(
    '/discounts',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(discountController.getDiscounts)
  );

  router.post(
    '/discounts',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(ValidatorMiddleware.body(DiscountValidator.validateCreateDiscount)),
    routeTryCatch(discountController.createDiscount)
  );

  // Audit Trail (Owner only)
  router.get(
    '/audit',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(adminController.getAuditLog)
  );

  // Operational Settings (Owner only)
  router.get(
    '/settings',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(adminController.getSettings)
  );

  router.put(
    '/settings',
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(adminController.updateSettings)
  );

  return router;
}
