import { BaseController } from '../core/BaseController.js';
import {
  CreateOrderRequestDTO,
  TrackOrderRequestDTO,
  OrderStatusTransitionRequestDTO,
} from '../dtos/order.dto.js';

/**
 * Order & Order Tracking Controller (Class-Based, SOLID - SRP & DIP)
 */
export class OrderController extends BaseController {
  constructor(orderService) {
    super(orderService);
  }

  /**
   * Create a new order (automatically binds req.user.id if customer is logged in)
   */
  async createOrder(req, res) {
    const dto = new CreateOrderRequestDTO(req.body, req.headers, req.user || null).toJSON();
    const createdOrder = await this.service.createOrder(dto);
    const headers = createdOrder.accessToken
      ? { 'X-Order-Access-Token': createdOrder.accessToken }
      : {};
    return this.created(res, createdOrder, 'Order placed successfully', null, headers);
  }

  /**
   * POST /api/v1/orders/track — Track order by orderId + contact (or logged-in user session)
   */
  async trackOrder(req, res) {
    const dto = TrackOrderRequestDTO.fromEntity(req.body);
    const order = await this.service.trackOrder(dto, req.user || null);
    const headers = order.accessToken ? { 'X-Order-Access-Token': order.accessToken } : {};
    return this.ok(res, order, 'Order tracking status retrieved', null, headers);
  }

  /**
   * GET /api/v1/orders/track/:id — Track order by ID (protected by IDOR Ownership Guard)
   */
  async trackOrderById(req, res) {
    const order = await this.service.trackOrderById(req.params.id, {
      preloadedOrder: req.scopedOrder || null,
    });
    const headers = order.accessToken ? { 'X-Order-Access-Token': order.accessToken } : {};
    return this.ok(res, order, 'Order tracking status retrieved', null, headers);
  }

  /**
   * GET /api/v1/orders/my-orders — Paginated orders for the logged-in customer
   */
  async getMyOrders(req, res) {
    const paginationParams = this.getPaginationParams(req);
    const result = await this.service.getMyOrders(req.user, paginationParams);
    return this.paginated(res, result, 'Customer orders retrieved successfully');
  }

  /**
   * GET /api/v1/orders/:id — Get order details by ID (protected by IDOR Ownership Guard)
   */
  async getOrderById(req, res) {
    const isAdmin = Boolean(req.user && (req.user.role === 'Owner' || req.user.role === 'Staff'));
    const order = await this.service.getOrderById(req.params.id, {
      isAdmin,
      preloadedOrder: req.scopedOrder || null,
    });
    return this.ok(res, order, 'Order retrieved successfully');
  }

  async getAdminOrders(req, res) {
    const paginationParams = this.getPaginationParams(req);
    const result = await this.service.getAdminOrders(paginationParams);
    return this.paginated(res, result, 'Orders ledger retrieved successfully');
  }

  async transitionOrderStatus(req, res) {
    const dto = OrderStatusTransitionRequestDTO.fromEntity(req.body);
    const actor = req.user?.name || 'Owner';
    const updated = await this.service.updateOrderStatus(req.params.id, dto, actor);
    return this.ok(res, updated, `Order status transitioned to ${dto.status}`);
  }

  async bulkTransitionOrderStatus(req, res) {
    const { orderIds, status, note } = req.body;
    const actor = req.user?.name || 'Owner';
    const updated = await this.service.bulkUpdateOrderStatus(orderIds, status, note, actor);
    return this.ok(res, updated, `Updated ${updated.length} orders to ${status}`);
  }
}
