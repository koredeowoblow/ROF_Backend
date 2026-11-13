import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { cryptoService } from '../utils/crypto.js';
import {
  PublicOrderResponseDTO,
  OrderTrackingResponseDTO,
  AdminOrderResponseDTO,
} from '../dtos/order.dto.js';

/**
 * Order & Order Tracking Domain Service (Class-Based, SOLID - SRP, OCP & DIP)
 *
 * Implements:
 * - Server-side price recalculation (never trusts client unitPrice/subtotal/total)
 * - Customer userId binding when user logs in before checkout/payment for account-level order tracking
 * - Idempotency key deduplication via IdempotencyRepository
 * - Stock validation & deduction before order creation
 * - Rich 5-stage Order Tracking timeline (OrderTrackingResponseDTO) + IDOR ownership verification
 */
export class OrderService extends BaseService {
  constructor({
    orderRepository,
    productRepository,
    contentRepository,
    discountService,
    idempotencyRepository,
    auditService,
  }) {
    super(orderRepository, auditService);
    this.productRepository = productRepository;
    this.contentRepository = contentRepository;
    this.discountService = discountService;
    this.idempotencyRepository = idempotencyRepository;
  }

  /**
   * Create a new order with server-side price recalculation, userId binding, and stock deduction
   */
  async createOrder(createOrderDto) {
    if (createOrderDto.idempotencyKey) {
      const existingIdempotency = await this.idempotencyRepository.findByKey(
        createOrderDto.idempotencyKey
      );
      if (existingIdempotency && existingIdempotency.responsePayload) {
        return existingIdempotency.responsePayload;
      }
    }

    const isLagos = createOrderDto.customer.state.toLowerCase().includes('lagos');
    if (createOrderDto.paymentMethod === 'delivery' && !isLagos) {
      throw AppError.badRequest('Pay on Delivery is only available for Lagos state deliveries');
    }

    // 1. Validate all items & stock availability before mutating inventory
    let recomputedSubtotal = 0;
    const verifiedItems = [];

    for (const item of createOrderDto.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product || !product.published) {
        throw AppError.badRequest(
          `Product '${item.name || item.productId}' is no longer available`
        );
      }

      const variant = product.variants.find((v) => v.size === item.size);
      if (!variant) {
        throw AppError.badRequest(`Size '${item.size}' is not valid for ${product.name}`);
      }
      if (variant.stock < item.qty) {
        throw AppError.badRequest(
          `Insufficient stock for ${product.name} (${item.size}). Available: ${variant.stock}`
        );
      }

      const authoritativeUnitPrice = Number(product.price);
      recomputedSubtotal += authoritativeUnitPrice * item.qty;

      verifiedItems.push({
        productId: product.id,
        name: product.name,
        colour: product.colour,
        size: item.size,
        qty: item.qty,
        unitPrice: authoritativeUnitPrice,
        image: product.images?.[0] || item.image || '/images/placeholder.webp',
      });
    }

    // 2. Deduct stock atomically in MongoDB
    for (const item of verifiedItems) {
      const decremented = await this.productRepository.decrementVariantStock(
        item.productId,
        item.size,
        item.qty
      );
      if (!decremented) {
        throw AppError.conflict(`Could not reserve stock for ${item.name} (${item.size})`);
      }
    }

    // 3. Authoritative Delivery Fee from Content Config
    const content = await this.contentRepository.getContent();
    const lagosFee = Number(content?.delivery?.lagosFee?.value ?? 2500);
    const interstateFee = Number(content?.delivery?.interstateFee?.value ?? 4500);
    const fee = isLagos ? lagosFee : interstateFee;

    // 4. Authoritative Discount Calculation
    let discountAmount = 0;
    let appliedDiscount = null;
    if (createOrderDto.discountCode) {
      const discountResult = await this.discountService.computeDiscount(
        createOrderDto.discountCode,
        recomputedSubtotal,
        { enforceThreshold: false }
      );
      discountAmount = discountResult.discountAmount;
      appliedDiscount = discountResult.discountEntity;
    }

    const total = Math.max(0, recomputedSubtotal + fee - discountAmount);
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderId = `ROF-${randomSuffix}`;
    const nowIso = new Date().toISOString();

    const orderEntity = {
      id: orderId,
      userId: createOrderDto.userId || null,
      customer: createOrderDto.customer,
      items: verifiedItems,
      subtotal: recomputedSubtotal,
      fee,
      discount: discountAmount,
      total,
      payment: {
        method: createOrderDto.paymentMethod,
        // Starts pending until payment gateway initialization/verification completes
        status: 'pending',
        reference: `pstk_ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      },
      status: 'received',
      notes: createOrderDto.customer.notes || '',
      internalNotes: '',
      createdAt: nowIso,
      history: [
        {
          status: 'received',
          timestamp: nowIso,
          note: `Order placed online via ${createOrderDto.paymentMethod}`,
        },
      ],
    };

    const savedOrder = await this.repository.create(orderEntity);

    if (appliedDiscount) {
      await this.discountService.repository.incrementUsage(appliedDiscount.id);
    }

    // 5. Generate cryptographic IDOR Order Ownership Token for customer
    const accessToken = cryptoService.generateOrderAccessToken(
      savedOrder.id,
      savedOrder.customer.email,
      savedOrder.customer.phone
    );

    const responseDto = OrderTrackingResponseDTO.fromEntity(savedOrder, { accessToken });

    if (createOrderDto.idempotencyKey) {
      await this.idempotencyRepository.save({
        key: createOrderDto.idempotencyKey,
        orderId: savedOrder.id,
        responsePayload: responseDto,
      });
    }

    return responseDto;
  }

  /**
   * Track order by orderId + customer phone/email OR authenticated user session (IDOR-safe)
   * Returns full OrderTrackingResponseDTO with 5-stage progress timeline.
   */
  async trackOrder(trackOrderDto, authenticatedUser = null) {
    const { orderId, contact } = trackOrderDto;
    const existingOrder = await this.repository.findById(orderId);
    if (!existingOrder) {
      throw AppError.notFound('Order', orderId);
    }

    const { order, ownershipValid } = await this.repository.findByIdAndCustomerContact(
      orderId,
      contact || authenticatedUser?.email || '',
      authenticatedUser?.id || null
    );

    if (!ownershipValid || !order) {
      throw AppError.idor(
        'No order found matching those credentials. Please check your reference and phone/email.'
      );
    }

    const accessToken = cryptoService.generateOrderAccessToken(
      order.id,
      order.customer.email,
      order.customer.phone
    );

    return OrderTrackingResponseDTO.fromEntity(order, { accessToken });
  }

  /**
   * Track a specific order by ID (GET /api/v1/orders/track/:id)
   * Protected by IDOR Ownership Guard (requires logged-in owner, valid X-Order-Access-Token, or matching contact).
   */
  async trackOrderById(orderId, { preloadedOrder = null } = {}) {
    const order = preloadedOrder || (await this.repository.findById(orderId.toUpperCase()));
    if (!order) {
      throw AppError.notFound('Order', orderId);
    }

    const accessToken = cryptoService.generateOrderAccessToken(
      order.id,
      order.customer.email,
      order.customer.phone
    );

    return OrderTrackingResponseDTO.fromEntity(order, { accessToken });
  }

  /**
   * Retrieve paginated orders for the currently logged-in customer (GET /api/v1/orders/my-orders)
   * Enforces strict IDOR isolation: only returns orders belonging to `user.id` or `user.email`.
   */
  async getMyOrders(authenticatedUser, paginationParams = {}) {
    if (!authenticatedUser) {
      throw AppError.unauthorized('Please log in to view and track your orders');
    }

    // Ensure any unlinked orders with the user's verified email are attached to their userId
    await this.repository.attachUserToGuestOrders(authenticatedUser.id, authenticatedUser.email);

    const result = await this.repository.findPaginatedByUser(
      authenticatedUser.id,
      authenticatedUser.email,
      paginationParams
    );

    return {
      data: OrderTrackingResponseDTO.fromEntities(result.data),
      meta: result.meta,
    };
  }

  /**
   * Get single order by ID with role-appropriate DTO projection
   */
  async getOrderById(orderId, { isAdmin = false, preloadedOrder = null } = {}) {
    const order = preloadedOrder || (await this.repository.findById(orderId.toUpperCase()));
    if (!order) {
      throw AppError.notFound('Order', orderId);
    }
    return isAdmin
      ? AdminOrderResponseDTO.fromEntity(order)
      : OrderTrackingResponseDTO.fromEntity(order);
  }

  /**
   * List orders with pagination, status filter, and search (Admin/Staff)
   */
  async getAdminOrders(paginationParams = {}) {
    const filter = {};
    if (paginationParams.status && paginationParams.status !== 'all') {
      filter.status = paginationParams.status;
    }

    const result = await this.repository.findPaginated(paginationParams, {
      filter,
      searchFields: [
        'id',
        'customer.name',
        'customer.email',
        'customer.phone',
        'customer.city',
        'customer.state',
      ],
      defaultSort: { createdAt: -1 },
    });

    return {
      data: AdminOrderResponseDTO.fromEntities(result.data),
      meta: result.meta,
    };
  }

  /**
   * Update order fulfillment status & append history entry (Admin/Staff)
   */
  async updateOrderStatus(orderId, transitionDto, actorName = 'Owner') {
    const existing = await this.repository.findById(orderId.toUpperCase());
    if (!existing) {
      throw AppError.notFound('Order', orderId);
    }

    const updated = await this.repository.transitionStatus(existing.id, transitionDto);

    await this.recordAudit({
      action: 'Status Change',
      entity: 'Order',
      entityId: existing.id,
      user: actorName,
      details: `Order status shifted to ${transitionDto.status}. ${transitionDto.note || ''}`.trim(),
    });

    return AdminOrderResponseDTO.fromEntity(updated);
  }

  /**
   * Bulk status transition for multiple orders (Admin/Staff)
   */
  async bulkUpdateOrderStatus(orderIds = [], status, note, actorName = 'Owner') {
    const updatedOrders = [];
    for (const id of orderIds) {
      const updated = await this.updateOrderStatus(
        id,
        { status, note: note || `Bulk transition to ${status}` },
        actorName
      );
      updatedOrders.push(updated);
    }
    return updatedOrders;
  }
}
