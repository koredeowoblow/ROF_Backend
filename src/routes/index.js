import { Router } from 'express';
import { createAuthRoutes } from './auth.routes.js';
import { createProductRoutes } from './product.routes.js';
import { createCategoryRoutes } from './category.routes.js';
import { createWishlistRoutes } from './wishlist.routes.js';
import { createOrderRoutes } from './order.routes.js';
import { createContentRoutes } from './content.routes.js';
import { createMessageRoutes, createNewsletterRoutes } from './message.routes.js';
import { createPaymentRoutes } from './payment.routes.js';
import { createDiscountRoutes } from './discount.routes.js';
import { createAdminRoutes } from './admin.routes.js';
import { ResponseHandler } from '../utils/responseHandler.js';
import { mongoDatabase } from '../database/MongoDatabase.js';

/**
 * Root API v1 Router Factory
 */
export function createApiRouter(container) {
  const router = Router();
  const { controllers, repositories } = container;

  // Health check endpoint
  router.get('/health', (req, res) => {
    return ResponseHandler.success(res, {
      data: {
        service: 'rof-rage-backend',
        status: 'healthy',
        database: mongoDatabase.getStatus(),
        uptimeSeconds: Math.round(process.uptime()),
      },
      message: 'ROF RAGE API is operational',
    });
  });

  // Public & Storefront Routes
  router.use('/auth', createAuthRoutes(controllers.auth));
  router.use('/products', createProductRoutes(controllers.product, controllers.review));
  router.use('/categories', createCategoryRoutes(controllers.category));
  router.use('/wishlist', createWishlistRoutes(controllers.wishlist));
  router.use('/orders', createOrderRoutes(controllers.order, repositories.order));
  router.use('/content', createContentRoutes(controllers.content));
  router.use('/messages', createMessageRoutes(controllers.message));
  router.use('/newsletter', createNewsletterRoutes(controllers.newsletter));
  router.use('/payments', createPaymentRoutes(controllers.payment));
  router.use('/discounts', createDiscountRoutes(controllers.discount));

  // Admin Studio Routes
  router.use(
    '/admin',
    createAdminRoutes({
      adminController: controllers.admin,
      orderController: controllers.order,
      productController: controllers.product,
      categoryController: controllers.category,
      reviewController: controllers.review,
      discountController: controllers.discount,
      messageController: controllers.message,
      contentController: controllers.content,
    })
  );

  return router;
}
