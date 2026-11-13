import { BaseController } from '../core/BaseController.js';
import { InitializePaymentRequestDTO } from '../dtos/payment.dto.js';

/**
 * Payment Controller (Class-Based, SOLID - SRP & DIP)
 * Supports unified and provider-specific endpoints for Paystack, Stripe, and Flutterwave.
 * Enforces user login before payment initialization so orders are linked to the user's account for tracking.
 */
export class PaymentController extends BaseController {
  constructor(paymentService) {
    super(paymentService);
  }

  /**
   * GET /api/v1/payments/providers
   * Returns active default online provider ('paystack' | 'stripe' | 'flutterwave') and all provider configs
   */
  async getProviders(_req, res) {
    const configData = this.service.getProvidersConfig();
    return this.ok(res, configData, 'Payment providers retrieved');
  }

  /**
   * POST /api/v1/payments/initialize
   * Uses the backend's configured PAYMENT_PROVIDER or the requested provider/method
   */
  async initializePayment(req, res) {
    const dto = InitializePaymentRequestDTO.fromEntity({
      ...req.body,
      email: req.body?.email || req.user?.email || '',
    });
    const initialized = await this.service.initializePayment(dto, req.user);
    return this.ok(res, initialized, 'Payment session initialized');
  }

  /**
   * POST /api/v1/payments/paystack/initialize
   */
  async initializePaystack(req, res) {
    const dto = InitializePaymentRequestDTO.fromEntity({
      ...req.body,
      provider: 'paystack',
      method: 'paystack',
      email: req.body?.email || req.user?.email || '',
    });
    const initialized = await this.service.initializePayment(dto, req.user);
    return this.ok(res, initialized, 'Paystack authorization url created');
  }

  /**
   * POST /api/v1/payments/stripe/initialize
   */
  async initializeStripe(req, res) {
    const dto = InitializePaymentRequestDTO.fromEntity({
      ...req.body,
      provider: 'stripe',
      method: 'stripe',
      email: req.body?.email || req.user?.email || '',
    });
    const initialized = await this.service.initializePayment(dto, req.user);
    return this.ok(res, initialized, 'Stripe checkout session created');
  }

  /**
   * POST /api/v1/payments/flutterwave/initialize
   */
  async initializeFlutterwave(req, res) {
    const dto = InitializePaymentRequestDTO.fromEntity({
      ...req.body,
      provider: 'flutterwave',
      method: 'flutterwave',
      email: req.body?.email || req.user?.email || '',
    });
    const initialized = await this.service.initializePayment(dto, req.user);
    return this.ok(res, initialized, 'Flutterwave payment link created');
  }

  /**
   * GET/POST /api/v1/payments/verify/:reference
   */
  async verifyPayment(req, res) {
    const reference = req.params.reference || req.body?.reference;
    const order = await this.service.verifyPayment(reference, req.user || null);
    return this.ok(res, order, 'Payment verified and order confirmed for tracking');
  }

  /**
   * POST /api/v1/payments/webhook/:provider
   */
  async handleProviderWebhook(req, res) {
    const provider = String(req.params.provider || '').toLowerCase();
    const signature =
      req.headers['x-paystack-signature'] ||
      req.headers['stripe-signature'] ||
      req.headers['verif-hash'] ||
      req.headers['flutterwave-signature'] ||
      null;
    const result = await this.service.handleWebhook(provider, req.body, signature);
    return this.ok(res, result, 'Webhook processed');
  }

  async handlePaystackWebhook(req, res) {
    const signature = req.headers['x-paystack-signature'] || null;
    const result = await this.service.handlePaystackWebhook(req.body, signature);
    return this.ok(res, result, 'Paystack webhook processed');
  }

  async handleStripeWebhook(req, res) {
    const signature = req.headers['stripe-signature'] || null;
    const result = await this.service.handleStripeWebhook(req.body, signature);
    return this.ok(res, result, 'Stripe webhook processed');
  }

  async handleFlutterwaveWebhook(req, res) {
    const signature =
      req.headers['verif-hash'] || req.headers['flutterwave-signature'] || null;
    const result = await this.service.handleFlutterwaveWebhook(req.body, signature);
    return this.ok(res, result, 'Flutterwave webhook processed');
  }
}
