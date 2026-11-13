import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { ContentValidator } from '../validators/content.validator.js';

export function createContentRoutes(contentController) {
  const router = Router();

  router.get('/', routeTryCatch(contentController.getContent));

  router.put(
    '/',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(AuthMiddleware.authorizeRoles('Owner')),
    routeTryCatch(ValidatorMiddleware.body(ContentValidator.validateUpdateContent)),
    routeTryCatch(contentController.updateContent)
  );

  return router;
}

