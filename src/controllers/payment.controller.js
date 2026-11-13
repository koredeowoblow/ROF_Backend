import { BaseController } from '../core/BaseController.js';
import { InitializePaymentRequestDTO } from '../dtos/payment.dto.js';

/**
 * Payment Controller (Class-Based, SOLID - SRP & DIP)
 * Enforces user login before payment initialization so orders are linked to the user's account for tracking.
 */
export class PaymentController extends BaseController {
  constructor(paymentService) {
    super(paymentService);
  }

  async initializePaystack(req, res) {
    const dto = InitializePaymentRequestDTO.fromEntity({
      ...req.body,
      email: req.body?.email || req.user?.email || '',
    });
    const initialized = await this.service.initializePayment(dto, req.user);
    return this.ok(res, initialized, 'Authorization url created');
  }

  async verifyPayment(req, res) {
    const reference = req.params.reference || req.body?.reference;
    const order = await this.service.verifyPayment(reference, req.user || null);
    return this.ok(res, order, 'Payment verified and order confirmed for tracking');
  }

  async handlePaystackWebhook(req, res) {
    const signature = req.headers['x-paystack-signature'] || null;
    const result = await this.service.handlePaystackWebhook(req.body, signature);
    return this.ok(res, result, 'Webhook processed');
  }
}
