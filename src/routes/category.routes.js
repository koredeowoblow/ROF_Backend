import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { UploadMiddleware } from '../middlewares/uploadMiddleware.js';
import { CategoryValidator } from '../validators/category.validator.js';
import { PaginationValidator } from '../validators/pagination.validator.js';

/**
 * Category & Category Page Routes (/api/v1/categories/*)
 */
export function createCategoryRoutes(categoryController) {
  const router = Router();

  // Public list of active categories with product counts
  router.get(
    '/',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(categoryController.getCategories)
  );

  // Public Category Page by slug or ID (includes category metadata, banner, facets, and paginated products)
  router.get(
    '/:slug',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(categoryController.getCategoryPage)
  );

  // Alias for Category Page products
  router.get(
    '/:slug/products',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(ValidatorMiddleware.query(PaginationValidator.validateQuery)),
    routeTryCatch(categoryController.getCategoryPage)
  );

  // Admin: Create category with optional Cloudinary banner upload (Owner only)
  router.post(
    '/',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(UploadMiddleware.parseImages({ maxFiles: 1 })),
    routeTryCatch(ValidatorMiddleware.body(CategoryValidator.validateSaveCategory)),
    routeTryCatch(categoryController.saveCategory)
  );

  // Admin: Update category with optional Cloudinary banner upload (Owner only)
  router.put(
    '/:id',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(UploadMiddleware.parseImages({ maxFiles: 1 })),
    routeTryCatch(ValidatorMiddleware.body(CategoryValidator.validateSaveCategory)),
    routeTryCatch(categoryController.saveCategory)
  );

  // Admin: Delete category (Owner only)
  router.delete(
    '/:id',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(categoryController.deleteCategory)
  );

  return router;
}

