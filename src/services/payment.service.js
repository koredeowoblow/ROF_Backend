import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { config } from '../config/index.js';
import { cryptoService } from '../utils/crypto.js';
import { PaymentInitializedResponseDTO } from '../dtos/payment.dto.js';
import { OrderTrackingResponseDTO } from '../dtos/order.dto.js';
import { PaymentGatewayStrategy } from './gateways/BaseGatewayService.js';
import { PaystackGatewayStrategy, PaystackService } from './gateways/paystack.gateway.js';
import { StripeGatewayStrategy, StripeService } from './gateways/stripe.gateway.js';
import { FlutterwaveGatewayStrategy, FlutterwaveService } from './gateways/flutterwave.gateway.js';
import {
  BankTransferGatewayStrategy,
  DeliveryGatewayStrategy,
} from './gateways/offline.gateway.js';

export {
  PaymentGatewayStrategy,
  PaystackGatewayStrategy,
  PaystackService,
  StripeGatewayStrategy,
  StripeService,
  FlutterwaveGatewayStrategy,
  FlutterwaveService,
  BankTransferGatewayStrategy,
  DeliveryGatewayStrategy,
};

/**
 * Payment Orchestration Service (Class-Based, SOLID - SRP, OCP & DIP)
 *
 * Supports interchangeable online payment providers:
 * - Paystack ('paystack')
 * - Stripe ('stripe')
 * - Flutterwave ('flutterwave' / 'flutter')
 * Plus offline settlement channels:
 * - Direct Studio Bank Transfer ('bank_transfer')
 * - Pay on Delivery ('delivery')
 *
 * Switch the active online provider globally via `.env`:
 *   PAYMENT_PROVIDER=paystack | stripe | flutterwave
 * or at runtime via `paymentService.setDefaultProvider('stripe')`.
 */
export class PaymentService extends BaseService {
  constructor(orderRepository, auditService) {
    super(orderRepository, auditService);

    const paystackGateway = new PaystackGatewayStrategy();
    const stripeGateway = new StripeGatewayStrategy();
    const flutterwaveGateway = new FlutterwaveGatewayStrategy();
    const bankTransferGateway = new BankTransferGatewayStrategy();
    const deliveryGateway = new DeliveryGatewayStrategy();

    this.strategies = {
      paystack: paystackGateway,
      stripe: stripeGateway,
      flutterwave: flutterwaveGateway,
      flutter: flutterwaveGateway,
      bank_transfer: bankTransferGateway,
      delivery: deliveryGateway,
    };

    this.activeProviderOverride = null;
  }

  /**
   * Normalize provider alias ('flutter' -> 'flutterwave')
   */
  normalizeProviderName(name) {
    const raw = String(name || '').trim().toLowerCase();
    if (raw === 'flutter') return 'flutterwave';
    return raw;
  }

  /**
   * Return the currently active online payment provider ('paystack' | 'stripe' | 'flutterwave').
   * Reads runtime override first, then process.env.PAYMENT_PROVIDER, then config.payment.defaultProvider.
   */
  getDefaultProvider() {
    const candidate = this.normalizeProviderName(
      this.activeProviderOverride ||
        process.env.PAYMENT_PROVIDER ||
        config.payment?.defaultProvider ||
        'paystack'
    );
    if (['paystack', 'stripe', 'flutterwave'].includes(candidate)) {
      return candidate;
    }
    return 'paystack';
  }

  /**
   * Dynamically change the active online payment provider at runtime.
   */
  setDefaultProvider(providerName) {
    const normalized = this.normalizeProviderName(providerName);
    if (!['paystack', 'stripe', 'flutterwave'].includes(normalized)) {
      throw AppError.badRequest(
        `Invalid online payment provider '${providerName}'. Allowed: paystack, stripe, flutterwave`
      );
    }
    this.activeProviderOverride = normalized;
    return this.getDefaultProvider();
  }

  /**
   * Resolve which gateway strategy to use for a given request.
   * - Offline methods ('bank_transfer', 'delivery') always use their respective offline strategy.
   * - Explicit provider override (`dto.provider`) routes directly to that provider.
   * - Generic online methods ('card', 'online', 'default') or default 'paystack' when
   *   PAYMENT_PROVIDER is configured to another provider route to `getDefaultProvider()`.
   */
  resolveProvider({ method, provider } = {}) {
    if (provider) {
      const explicit = this.normalizeProviderName(provider);
      if (!this.strategies[explicit]) {
        throw AppError.badRequest(`Unsupported payment provider: ${provider}`);
      }
      return explicit;
    }

    const normalizedMethod = this.normalizeProviderName(method);
    if (normalizedMethod === 'bank_transfer' || normalizedMethod === 'delivery') {
      return normalizedMethod;
    }

    if (normalizedMethod === 'stripe' || normalizedMethod === 'flutterwave') {
      return normalizedMethod;
    }

    if (
      !normalizedMethod ||
      normalizedMethod === 'card' ||
      normalizedMethod === 'online' ||
      normalizedMethod === 'default'
    ) {
      return this.getDefaultProvider();
    }

    if (normalizedMethod === 'paystack') {
      return this.getDefaultProvider();
    }

    if (!this.strategies[normalizedMethod]) {
      throw AppError.badRequest(`Unsupported payment gateway strategy: ${method}`);
    }

    return normalizedMethod;
  }

  /**
   * List available payment providers and the currently active default online provider.
   */
  getProvidersConfig() {
    const defaultProvider = this.getDefaultProvider();
    return {
      defaultProvider,
      activeGateway: this.strategies[defaultProvider]?.getPublicConfig(),
      providers: {
        paystack: this.strategies.paystack.getPublicConfig(),
        stripe: this.strategies.stripe.getPublicConfig(),
        flutterwave: this.strategies.flutterwave.getPublicConfig(),
        bank_transfer: this.strategies.bank_transfer.getPublicConfig(),
        delivery: this.strategies.delivery.getPublicConfig(),
      },
    };
  }

  /**
   * Initialize payment for an order.
   * Requires authenticated user (or verified order ownership) and links `userId` to the order
   * so that the customer can track the order from their account.
   */
  async initializePayment(initPaymentDto, authenticatedUser = null) {
    if (!authenticatedUser) {
      throw AppError.unauthorized(
        'Please log in to your account before initializing payment so your order can be tracked'
      );
    }

    const order = await this.repository.findById(initPaymentDto.orderId);
    if (!order) {
      throw AppError.notFound('Order', initPaymentDto.orderId);
    }

    // IDOR protection: verify that the logged-in user owns this order
    const userIdMatches = order.userId && String(order.userId) === String(authenticatedUser.id);
    const emailMatches =
      order.customer.email.toLowerCase() ===
        (initPaymentDto.email || authenticatedUser.email || '').toLowerCase() &&
      order.customer.email.toLowerCase() === authenticatedUser.email.toLowerCase();

    if (!userIdMatches && !emailMatches && authenticatedUser.role === 'Customer') {
      throw AppError.idor(
        'IDOR Protection: You cannot initialize payment for an order belonging to another customer'
      );
    }

    const resolvedProvider = this.resolveProvider({
      method: initPaymentDto.method || order.payment?.method,
      provider: initPaymentDto.provider,
    });

    const strategy = this.strategies[resolvedProvider];
    if (!strategy) {
      throw AppError.badRequest(`Unsupported payment gateway strategy: ${resolvedProvider}`);
    }

    const initialized = await strategy.initialize({
      orderId: order.id,
      amount: order.total, // Server-authoritative total
      email: order.customer.email,
      phone: order.customer.phone,
      customerName: order.customer.name,
      callbackUrl: initPaymentDto.callbackUrl,
      currency: initPaymentDto.currency,
    });

    // Bind authenticatedUser.id to the order so it is permanently linked for tracking
    await this.repository.updateById(order.id, {
      userId: order.userId || authenticatedUser.id,
      payment: {
        method: resolvedProvider,
        provider: resolvedProvider,
        status: order.payment.status,
        reference: initialized.reference,
      },
    });

    return PaymentInitializedResponseDTO.fromEntity({
      ...initialized,
      provider: resolvedProvider,
      method: resolvedProvider,
    });
  }

  /**
   * Verify payment by reference across the order's active gateway and transition order to 'confirmed'
   */
  async verifyPayment(reference, authenticatedUser = null) {
    const order = await this.repository.findByPaymentReference(reference);
    if (!order) {
      throw AppError.notFound('Order payment reference', reference);
    }

    if (
      authenticatedUser &&
      authenticatedUser.role === 'Customer' &&
      order.userId &&
      String(order.userId) !== String(authenticatedUser.id) &&
      order.customer.email.toLowerCase() !== authenticatedUser.email.toLowerCase()
    ) {
      throw AppError.idor('IDOR Protection: You are not authorized to verify this payment');
    }

    const providerKey = this.normalizeProviderName(
      order.payment?.provider || order.payment?.method || this.getDefaultProvider()
    );
    const strategy = this.strategies[providerKey] || this.strategies[this.getDefaultProvider()];
    const verificationResult = await strategy.verify(reference);

    if (!verificationResult.verified && !verificationResult.success) {
      throw AppError.badRequest(`Payment verification failed for reference ${reference}`);
    }

    const paidAt = verificationResult.paidAt || new Date().toISOString();
    await this.repository.updateById(order.id, {
      userId: order.userId || authenticatedUser?.id || null,
      payment: {
        ...order.payment,
        provider: providerKey,
        status: 'paid',
        paidAt,
      },
    });

    const updatedOrder = await this.repository.transitionStatus(order.id, {
      status: order.status === 'received' ? 'confirmed' : order.status,
      note: `Payment verified via ${strategy.name} (${reference})`,
    });

    await this.recordAudit({
      action: 'Payment Verified',
      entity: 'Order',
      entityId: order.id,
      user: authenticatedUser?.email || order.customer.email,
      details: `${strategy.name} reference ${reference} verified and order confirmed`,
    });

    const accessToken = cryptoService.generateOrderAccessToken(
      updatedOrder.id,
      updatedOrder.customer.email,
      updatedOrder.customer.phone
    );

    return OrderTrackingResponseDTO.fromEntity(updatedOrder, { accessToken });
  }

  /**
   * Unified Webhook Handler for Paystack, Stripe, and Flutterwave
   */
  async handleWebhook(providerName, eventPayload = {}, signatureHeader = null) {
    const normalized = this.normalizeProviderName(providerName || this.getDefaultProvider());
    const strategy = this.strategies[normalized];
    if (!strategy) {
      throw AppError.badRequest(`Unsupported webhook payment provider: ${providerName}`);
    }

    if (signatureHeader) {
      const isValidSig = strategy.verifyWebhookSignature(eventPayload, signatureHeader);
      if (!isValidSig) {
        throw AppError.unauthorized(
          `Invalid ${strategy.name} webhook signature`,
          'INVALID_SIGNATURE'
        );
      }
    }

    const parsed = strategy.parseWebhookEvent(eventPayload);
    if (parsed.isPaid && parsed.reference) {
      const order = await this.repository.findByPaymentReference(parsed.reference);
      if (order) {
        await this.repository.updateById(order.id, {
          payment: {
            ...order.payment,
            provider: normalized,
            status: 'paid',
            paidAt: new Date().toISOString(),
          },
        });
        await this.repository.transitionStatus(order.id, {
          status: 'confirmed',
          note: `${strategy.name} webhook verified ${parsed.event} (${parsed.reference})`,
        });
        await this.recordAudit({
          action: 'Payment Webhook Confirmed',
          entity: 'Order',
          entityId: order.id,
          user: `${strategy.name} Webhook`,
          details: `Verified payment reference ${parsed.reference}`,
        });
      }
    }

    return { status: 'success', provider: normalized, received: true };
  }

  async handlePaystackWebhook(eventPayload = {}, signatureHeader = null) {
    return this.handleWebhook('paystack', eventPayload, signatureHeader);
  }

  async handleStripeWebhook(eventPayload = {}, signatureHeader = null) {
    return this.handleWebhook('stripe', eventPayload, signatureHeader);
  }

  async handleFlutterwaveWebhook(eventPayload = {}, signatureHeader = null) {
    return this.handleWebhook('flutterwave', eventPayload, signatureHeader);
  }
}
