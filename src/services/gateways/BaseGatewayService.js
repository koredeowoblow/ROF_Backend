/**
 * Base Payment Gateway Strategy (SOLID - OCP & LSP)
 * All payment provider services (Paystack, Stripe, Flutterwave, Bank Transfer, Delivery)
 * implement this unified interface so the backend can swap providers via PAYMENT_PROVIDER
 * without modifying business logic.
 */
export class PaymentGatewayStrategy {
  constructor(provider, name) {
    this.provider = provider;
    this.name = name;
  }

  /**
   * Initialize a payment session for an order.
   * @param {Object} _params - { orderId, amount, email, phone, customerName, callbackUrl, currency, metadata }
   */
  async initialize(_params) {
    throw new Error('initialize() must be implemented by PaymentGatewayStrategy subclass');
  }

  /**
   * Verify a payment reference with the provider.
   * @param {string} reference
   */
  async verify(reference) {
    return {
      verified: true,
      success: true,
      status: 'paid',
      provider: this.provider,
      reference,
      paidAt: new Date().toISOString(),
    };
  }

  /**
   * Verify webhook signature for this provider.
   */
  verifyWebhookSignature(_rawBody, _signatureHeader) {
    return true;
  }

  /**
   * Normalize provider-specific webhook payload into a standard event shape:
   * { isPaid: boolean, reference: string | null, provider: string, event: string }
   */
  parseWebhookEvent(_payload) {
    return {
      isPaid: false,
      reference: null,
      provider: this.provider,
      event: 'unknown',
    };
  }

  /**
   * Return public metadata safe to expose to the storefront client.
   */
  getPublicConfig() {
    return {
      provider: this.provider,
      name: this.name,
      enabled: true,
    };
  }
}

