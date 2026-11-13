import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { PaymentValidator } from '../validators/payment.validator.js';

export function createPaymentRoutes(paymentController) {
  const router = Router();

  // Customer must be logged in before initializing payment so order is bound to userId for tracking
  router.post(
    '/paystack/initialize',
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(ValidatorMiddleware.body(PaymentValidator.validateInitialize)),
    routeTryCatch(paymentController.initializePaystack)
  );

  // Verify payment reference and transition order to confirmed for real-time tracking
  router.get(
    '/verify/:reference',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(paymentController.verifyPayment)
  );

  router.post(
    '/verify/:reference',
    routeTryCatch(AuthMiddleware.optionalAuth),
    routeTryCatch(paymentController.verifyPayment)
  );

  // Paystack server-to-server webhook
  router.post('/paystack/webhook', routeTryCatch(paymentController.handlePaystackWebhook));

  return router;
}
