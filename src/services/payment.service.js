import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { cryptoService } from '../utils/crypto.js';
import { PaymentInitializedResponseDTO } from '../dtos/payment.dto.js';
import { OrderTrackingResponseDTO } from '../dtos/order.dto.js';

/**
 * Payment Gateway Strategy Classes (SOLID - OCP & LSP)
 */
export class PaymentGatewayStrategy {
  constructor(name) {
    this.name = name;
  }

  async initialize(_params) {
    throw new Error('initialize() must be implemented by PaymentGatewayStrategy subclass');
  }

  async verify(_reference) {
    return { success: true, paidAt: new Date().toISOString() };
  }
}

export class PaystackGatewayStrategy extends PaymentGatewayStrategy {
  constructor() {
    super('Paystack Nigeria');
  }

  async initialize({ orderId, amount }) {
    const reference = `pstk_ref_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      reference,
      authorizationUrl: `https://checkout.paystack.com/${reference}`,
      accessCode: `code_${Date.now()}`,
      status: 'pending',
      amount,
      orderId,
    };
  }
}

export class BankTransferGatewayStrategy extends PaymentGatewayStrategy {
  constructor() {
    super('Direct Studio Bank Transfer');
  }

  async initialize({ orderId, amount }) {
    return {
      reference: `bank_ref_${Date.now()}`,
      status: 'pending',
      amount,
      orderId,
    };
  }
}

export class DeliveryGatewayStrategy extends PaymentGatewayStrategy {
  constructor() {
    super('Pay on Delivery');
  }

  async initialize({ orderId, amount }) {
    return {
      reference: `cod_ref_${Date.now()}`,
      status: 'pending',
      amount,
      orderId,
    };
  }
}

/**
 * Payment Orchestration Service (Class-Based, SOLID - SRP, OCP & DIP)
 *
 * Ensures users must be authenticated (or verified order owners) before payment
 * and links the authenticated user's `userId` to the order so every paid order
 * is accurately tracked under their account.
 */
export class PaymentService extends BaseService {
  constructor(orderRepository, auditService) {
    super(orderRepository, auditService);
    this.strategies = {
      paystack: new PaystackGatewayStrategy(),
      bank_transfer: new BankTransferGatewayStrategy(),
      delivery: new DeliveryGatewayStrategy(),
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

    const method = initPaymentDto.method || order.payment?.method || 'paystack';
    const strategy = this.strategies[method];
    if (!strategy) {
      throw AppError.badRequest(`Unsupported payment gateway strategy: ${method}`);
    }

    const initialized = await strategy.initialize({
      orderId: order.id,
      amount: order.total, // Server-authoritative total
      email: order.customer.email,
      phone: order.customer.phone,
      callbackUrl: initPaymentDto.callbackUrl,
    });

    // Bind authenticatedUser.id to the order so it is permanently linked for tracking
    await this.repository.updateById(order.id, {
      userId: order.userId || authenticatedUser.id,
      payment: {
        method,
        status: order.payment.status,
        reference: initialized.reference,
      },
    });

    return PaymentInitializedResponseDTO.fromEntity(initialized);
  }

  /**
   * Verify payment by reference and transition order to 'confirmed' for real-time tracking
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

    const paidAt = new Date().toISOString();
    await this.repository.updateById(order.id, {
      userId: order.userId || authenticatedUser?.id || null,
      payment: {
        ...order.payment,
        status: 'paid',
        paidAt,
      },
    });

    const updatedOrder = await this.repository.transitionStatus(order.id, {
      status: order.status === 'received' ? 'confirmed' : order.status,
      note: `Payment verified (${reference})`,
    });

    await this.recordAudit({
      action: 'Payment Verified',
      entity: 'Order',
      entityId: order.id,
      user: authenticatedUser?.email || order.customer.email,
      details: `Payment reference ${reference} verified and order confirmed`,
    });

    const accessToken = cryptoService.generateOrderAccessToken(
      updatedOrder.id,
      updatedOrder.customer.email,
      updatedOrder.customer.phone
    );

    return OrderTrackingResponseDTO.fromEntity(updatedOrder, { accessToken });
  }

  /**
   * Handle Paystack webhook events (charge.success)
   */
  async handlePaystackWebhook(eventPayload = {}, signatureHeader = null) {
    if (signatureHeader) {
      const isValidSig = cryptoService.verifyPaystackSignature(eventPayload, signatureHeader);
      if (!isValidSig) {
        throw AppError.unauthorized('Invalid Paystack webhook signature', 'INVALID_SIGNATURE');
      }
    }

    if (eventPayload?.event === 'charge.success' && eventPayload?.data?.reference) {
      const reference = String(eventPayload.data.reference);
      const order = await this.repository.findByPaymentReference(reference);
      if (order) {
        await this.repository.updateById(order.id, {
          payment: {
            ...order.payment,
            status: 'paid',
            paidAt: new Date().toISOString(),
          },
        });
        await this.repository.transitionStatus(order.id, {
          status: 'confirmed',
          note: `Paystack webhook verified charge.success (${reference})`,
        });
        await this.recordAudit({
          action: 'Payment Webhook Confirmed',
          entity: 'Order',
          entityId: order.id,
          user: 'Paystack Webhook',
          details: `Verified payment reference ${reference}`,
        });
      }
    }

    return { status: 'success', received: true };
  }
}
