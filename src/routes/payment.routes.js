import { Router } from 'express';
import { routeTryCatch } from '../middlewares/tryCatchHandler.js';
import { AuthMiddleware } from '../middlewares/authMiddleware.js';
import { RateLimiter } from '../middlewares/rateLimiter.js';
import { ValidatorMiddleware } from '../middlewares/validatorMiddleware.js';
import { PaymentValidator } from '../validators/payment.validator.js';

export function createPaymentRoutes(paymentController) {
  const router = Router();
  const paymentRateLimit = RateLimiter.payment();

  // Publicly inspect active payment provider & public keys
  router.get('/providers', routeTryCatch(paymentController.getProviders));

  // Unified payment initialization (automatically routes to PAYMENT_PROVIDER in .env or requested provider)
  router.post(
    '/initialize',
    routeTryCatch(paymentRateLimit),
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(ValidatorMiddleware.body(PaymentValidator.validateInitialize)),
    routeTryCatch(paymentController.initializePayment)
  );

  // Provider-specific initialization endpoints
  router.post(
    '/paystack/initialize',
    routeTryCatch(paymentRateLimit),
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(ValidatorMiddleware.body(PaymentValidator.validateInitialize)),
    routeTryCatch(paymentController.initializePaystack)
  );

  router.post(
    '/stripe/initialize',
    routeTryCatch(paymentRateLimit),
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(ValidatorMiddleware.body(PaymentValidator.validateInitialize)),
    routeTryCatch(paymentController.initializeStripe)
  );

  router.post(
    '/flutterwave/initialize',
    routeTryCatch(paymentRateLimit),
    routeTryCatch(AuthMiddleware.authenticate),
    routeTryCatch(ValidatorMiddleware.body(PaymentValidator.validateInitialize)),
    routeTryCatch(paymentController.initializeFlutterwave)
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

  // Server-to-server webhooks (Paystack, Stripe, Flutterwave, and unified :provider)
  router.post('/paystack/webhook', routeTryCatch(paymentController.handlePaystackWebhook));
  router.post('/stripe/webhook', routeTryCatch(paymentController.handleStripeWebhook));
  router.post(
    '/flutterwave/webhook',
    routeTryCatch(paymentController.handleFlutterwaveWebhook)
  );
  router.post('/webhook/:provider', routeTryCatch(paymentController.handleProviderWebhook));

  return router;
}
