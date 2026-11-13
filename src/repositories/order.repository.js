import { BaseRepository } from '../core/BaseRepository.js';
import { OrderModel } from '../models/order.model.js';

/**
 * Order MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class OrderRepository extends BaseRepository {
  constructor(model = OrderModel) {
    super(model, 'id');
  }

  /**
   * Find order by payment gateway reference
   */
  async findByPaymentReference(reference) {
    const cleanRef = String(reference || '').trim();
    return await this.findOne({ 'payment.reference': cleanRef });
  }

  /**
   * IDOR-safe order lookup by orderId AND matching customer email, phone, or userId
   */
  async findByIdAndCustomerContact(orderId, contact, userId = null) {
    const cleanId = String(orderId || '').trim().toUpperCase();
    const cleanContact = String(contact || '').trim().toLowerCase();
    const cleanPhoneDigits = cleanContact.replace(/\s+/g, '');

    const order = await this.findById(cleanId);
    if (!order) return { order: null, ownershipValid: false };

    const userIdMatch = Boolean(userId && order.userId && String(order.userId) === String(userId));
    const emailMatch = Boolean(cleanContact && order.customer?.email?.toLowerCase() === cleanContact);
    const phoneMatch = Boolean(
      cleanPhoneDigits && order.customer?.phone?.replace(/\s+/g, '') === cleanPhoneDigits
    );

    if (!userIdMatch && !emailMatch && !phoneMatch) {
      return { order: null, ownershipValid: false };
    }

    return { order, ownershipValid: true };
  }

  /**
   * Retrieve paginated orders belonging exclusively to a logged-in customer (IDOR-safe)
   */
  async findPaginatedByUser(userId, email, paginationParams = {}) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const ownershipClauses = [{ userId: String(userId) }];
    if (cleanEmail) {
      ownershipClauses.push({ 'customer.email': cleanEmail });
    }

    const filter = { $or: ownershipClauses };
    if (paginationParams.status && paginationParams.status !== 'all') {
      filter.status = paginationParams.status;
    }

    return await this.findPaginated(paginationParams, {
      filter,
      searchFields: ['id', 'status', 'courier', 'trackingNumber'],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * Link any existing orders with matching email to a newly logged-in or registered userId
   * so all orders are properly tracked under the customer's account.
   */
  async attachUserToGuestOrders(userId, email) {
    if (!userId || !email) return 0;
    const cleanEmail = String(email).trim().toLowerCase();
    const result = await this.model
      .updateMany(
        { 'customer.email': cleanEmail, $or: [{ userId: null }, { userId: { $exists: false } }] },
        { $set: { userId: String(userId) } }
      )
      .exec();
    return result.modifiedCount || 0;
  }

  /**
   * Append a status transition event to order history and update status in MongoDB
   */
  async transitionStatus(orderId, { status, note, internalNotes, courier, trackingNumber }) {
    const cleanId = String(orderId || '').trim().toUpperCase();
    const setFields = { status };
    if (courier !== undefined) setFields.courier = courier;
    if (trackingNumber !== undefined) setFields.trackingNumber = trackingNumber;
    if (internalNotes !== undefined) setFields.internalNotes = internalNotes;

    const historyEntry = {
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status changed to ${status}`,
    };

    const updated = await this.model
      .findOneAndUpdate(
        this.buildIdFilter(cleanId),
        {
          $set: setFields,
          $push: { history: historyEntry },
        },
        { new: true, runValidators: true }
      )
      .lean()
      .exec();

    return this.normalizeDoc(updated);
  }
}
