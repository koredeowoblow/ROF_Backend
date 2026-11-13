import { BaseDTO } from '../core/BaseDTO.js';

const TRACKING_STAGE_DEFINITIONS = [
  { status: 'received', label: 'Order Received', description: 'Recorded in dispatch ledger' },
  { status: 'confirmed', label: 'Payment Confirmed', description: 'Settlement verified' },
  { status: 'packed', label: 'Packed & Sealed', description: 'Sleeved in signature packaging' },
  { status: 'out_for_delivery', label: 'Out for Delivery', description: 'In courier transit' },
  { status: 'delivered', label: 'Delivered', description: 'Received and signed' },
];

/**
 * Order & Order Tracking Domain DTOs (Class-Based, SRP & ISP)
 * Separates Public Order DTO (hides internalNotes), Order Tracking Timeline DTO, and Admin Order DTO.
 */
export class CustomerInfoDTO extends BaseDTO {
  constructor(customer = {}) {
    super();
    this.name = String(customer.name || '').trim();
    this.phone = String(customer.phone || '').trim();
    this.email = String(customer.email || '').trim().toLowerCase();
    this.address = String(customer.address || '').trim();
    this.city = String(customer.city || '').trim();
    this.state = String(customer.state || '').trim();
    if (customer.notes) {
      this.notes = String(customer.notes).trim();
    }
  }
}

export class OrderItemDTO extends BaseDTO {
  constructor(item = {}) {
    super();
    this.productId = String(item.productId || '').trim();
    this.name = String(item.name || '').trim();
    this.colour = String(item.colour || '').trim();
    this.size = String(item.size || '').trim().toUpperCase();
    this.qty = Math.max(1, parseInt(item.qty, 10) || 1);
    this.unitPrice = Number(item.unitPrice || 0);
    this.image = String(item.image || '/images/placeholder.webp');
  }
}

export class CreateOrderRequestDTO extends BaseDTO {
  constructor(body = {}, headers = {}, authenticatedUser = null) {
    super();
    const rawCustomer = body.customer || {};
    this.userId = authenticatedUser?.id || null;
    this.customer = CustomerInfoDTO.fromEntity({
      name: rawCustomer.name || authenticatedUser?.name || '',
      phone: rawCustomer.phone || authenticatedUser?.phone || '',
      email: rawCustomer.email || authenticatedUser?.email || '',
      address: rawCustomer.address || authenticatedUser?.address || '',
      city: rawCustomer.city || authenticatedUser?.city || '',
      state: rawCustomer.state || authenticatedUser?.state || 'Lagos',
      notes: rawCustomer.notes,
    });
    this.items = OrderItemDTO.fromEntities(body.items || []);
    this.paymentMethod = body.paymentMethod || 'paystack';
    this.discountCode = body.discountCode
      ? String(body.discountCode).trim().toUpperCase()
      : undefined;
    this.idempotencyKey =
      headers['idempotency-key'] || body.idempotencyKey
        ? String(headers['idempotency-key'] || body.idempotencyKey).trim()
        : undefined;
  }
}

export class TrackOrderRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.orderId = String(body.orderId || '').trim().toUpperCase();
    this.contact = String(body.contact || body.phoneOrEmail || '').trim().toLowerCase();
  }
}

export class OrderStatusTransitionRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.status = String(body.status || '').trim();
    this.note = body.note ? String(body.note).trim() : undefined;
    this.internalNotes =
      body.internalNotes !== undefined ? String(body.internalNotes).trim() : undefined;
    this.courier = body.courier ? String(body.courier).trim() : undefined;
    this.trackingNumber = body.trackingNumber ? String(body.trackingNumber).trim() : undefined;
  }
}

/**
 * Public Order Response DTO
 * Strips administrative internalNotes to prevent sensitive staff data exposure.
 */
export class PublicOrderResponseDTO extends BaseDTO {
  constructor(order = {}, options = {}) {
    super();
    this.id = order.id;
    this.userId = order.userId || null;
    this.customer = CustomerInfoDTO.fromEntity(order.customer);
    this.items = OrderItemDTO.fromEntities(order.items);
    this.subtotal = Number(order.subtotal);
    this.fee = Number(order.fee);
    this.discount = Number(order.discount || 0);
    this.total = Number(order.total);
    this.payment = {
      method: order.payment?.method,
      status: order.payment?.status,
      reference: order.payment?.reference,
      ...(order.payment?.paidAt ? { paidAt: order.payment.paidAt } : {}),
    };
    this.status = order.status;
    if (order.notes) this.notes = order.notes;
    if (order.courier) this.courier = order.courier;
    if (order.trackingNumber) this.trackingNumber = order.trackingNumber;
    this.createdAt = order.createdAt;
    this.history = Array.isArray(order.history) ? [...order.history] : [];
    if (options.accessToken) {
      this.accessToken = options.accessToken;
    }
  }
}

/**
 * Rich Order Tracking Response DTO
 * Includes the full order details (without internalNotes) plus computed 5-stage tracking timeline,
 * progress percentage, courier waybill coordinates, and estimated delivery window.
 */
export class OrderTrackingResponseDTO extends PublicOrderResponseDTO {
  constructor(order = {}, options = {}) {
    super(order, options);
    const currentIdx = TRACKING_STAGE_DEFINITIONS.findIndex((s) => s.status === order.status);
    const historyByStatus = new Map(
      (order.history || []).map((h) => [h.status, { timestamp: h.timestamp, note: h.note }])
    );

    const isCancelledOrRefunded = order.status === 'cancelled' || order.status === 'refunded';

    this.tracking = {
      orderId: order.id,
      currentStatus: order.status,
      isCancelledOrRefunded,
      progressPercentage: isCancelledOrRefunded
        ? 0
        : currentIdx >= 0
          ? Math.round(((currentIdx + 1) / TRACKING_STAGE_DEFINITIONS.length) * 100)
          : 20,
      courier: order.courier || null,
      trackingNumber: order.trackingNumber || null,
      estimatedDelivery: order.customer?.state?.toLowerCase().includes('lagos')
        ? '1 to 2 business days (Lagos Express)'
        : '3 to 5 business days (Interstate Express)',
      steps: TRACKING_STAGE_DEFINITIONS.map((stage, idx) => {
        const recorded = historyByStatus.get(stage.status);
        const completed = !isCancelledOrRefunded && currentIdx >= idx;
        const active = !isCancelledOrRefunded && currentIdx === idx;
        return {
          stepNumber: idx + 1,
          status: stage.status,
          label: stage.label,
          description: stage.description,
          completed,
          active,
          timestamp: recorded?.timestamp || null,
          note: recorded?.note || null,
        };
      }),
    };
  }
}

/**
 * Admin Order Response DTO
 * Includes internalNotes and full administrative details.
 */
export class AdminOrderResponseDTO extends PublicOrderResponseDTO {
  constructor(order = {}) {
    super(order);
    this.internalNotes = order.internalNotes || '';
  }
}
