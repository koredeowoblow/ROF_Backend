import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { DiscountValidator } from '../validators/discount.validator.js';

export function createDiscountRoutes(discountController) {
  const router = Router();

  // Public checkout endpoint to validate a discount code against subtotal
  router.post(
    '/validate',
    routeTryCatch(ValidatorMiddleware.body(DiscountValidator.validateApplyDiscount)),
    routeTryCatch(discountController.validateDiscountCode)
  );

  return router;
}

