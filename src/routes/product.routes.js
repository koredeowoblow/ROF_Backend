import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { UploadMiddleware } from '../middlewares/uploadMiddleware.js';
import { ProductValidator } from '../validators/product.validator.js';
import { ReviewValidator } from '../validators/review.validator.js';
import { PaginationValidator } from '../validators/pagination.validator.js';

export function createProductRoutes(productController, reviewController = null) {
  const router = Router();

  // Public & optional-auth listing (supports category, colourKey, size, price range, featured filters)
  router.get(
    '/',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(productController.getProducts)
  );

  // Public related / paired products for a given product slug or id
  router.get(
    '/:slug/related',
    routeTryCatch(productController.getRelatedProducts)
  );

  // Product reviews & ratings
  if (reviewController) {
    router.get(
      '/:slug/reviews',
      routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
      routeTryCatch(reviewController.getProductReviews)
    );

    router.post(
      '/:slug/reviews',
      routeTryCatch(AuthMiddleware.authenticate),
      routeTryCatch(ValidatorMiddleware.body(ReviewValidator.validateCreateReview)),
      routeTryCatch(reviewController.createReview)
    );
  }

  // Public & optional-auth detail by slug or id
  router.get(
    '/:slug',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(productController.getProductBySlug)
  );

  // Admin: Create product with optional Cloudinary image upload (Owner only)
  router.post(
    '/',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(UploadMiddleware.parseImages()),
    routeTryCatch(ValidatorMiddleware.body(ProductValidator.validateSaveProduct)),
    routeTryCatch(productController.saveProduct)
  );

  // Admin: Update product with optional Cloudinary image upload (Owner only)
  router.put(
    '/:id',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(UploadMiddleware.parseImages()),
    routeTryCatch(ValidatorMiddleware.body(ProductValidator.validateSaveProduct)),
    routeTryCatch(productController.saveProduct)
  );

  // Admin: Upload images to Cloudinary and save URLs directly in the product (Owner or Staff)
  router.post(
    '/:id/images',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(UploadMiddleware.parseImages()),
    routeTryCatch(productController.uploadProductImages)
  );

  // Admin: Remove an image from a product and delete from Cloudinary (Owner or Staff)
  router.delete(
    '/:id/images',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch(productController.deleteProductImage)
  );

  // Admin: Adjust variant stock (Owner or Staff)
  router.patch(
    '/:id/inventory',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner', 'Staff')),
    routeTryCatch((req, _res, next) => {
      req.body = { ...req.body, productId: req.params.id };
      next();
    }),
    routeTryCatch(ValidatorMiddleware.body(ProductValidator.validateUpdateInventory)),
    routeTryCatch(productController.updateInventory)
  );

  // Admin: Delete product (Owner only)
  router.delete(
    '/:id',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(productController.deleteProduct)
  );

  return router;
}
