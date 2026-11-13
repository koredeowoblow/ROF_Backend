import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';

/**
 * Customer Wishlist / Saved Pieces Routes (/api/v1/wishlist/*)
 */
export function createWishlistRoutes(wishlistController) {
  const router = Router();

  router.use(routeTryCatch(AuthMiddleware.authenticate));

  router.get('/', routeTryCatch(wishlistController.getWishlist));
  router.post('/:productId/toggle', routeTryCatch(wishlistController.toggleProduct));
  router.post('/:productId', routeTryCatch(wishlistController.addProduct));
  router.delete('/:productId', routeTryCatch(wishlistController.removeProduct));

  return router;
}

