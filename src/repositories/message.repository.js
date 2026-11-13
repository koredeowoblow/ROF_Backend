import { BaseRepository } from '../core/BaseRepository.js';
import { MessageModel } from '../models/message.model.js';

/**
 * Contact Inquiry Message MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class MessageRepository extends BaseRepository {
  constructor(model = MessageModel) {
    super(model, 'id');
  }

  async toggleHandled(messageId) {
    const existing = await this.findById(messageId);
    if (!existing) return null;
    return await this.updateById(messageId, { handled: !existing.handled });
  }

  async addReply(messageId, replyEntry) {
    const updated = await this.model
      .findOneAndUpdate(
        this.buildIdFilter(messageId),
        {
          $set: { handled: true },
          $push: { replies: replyEntry },
        },
        { new: true, runValidators: true }
      )
      .lean()
      .exec();

    return this.normalizeDoc(updated);
  }

  async findPaginatedByUser(userId, email, paginationParams = {}) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const ownershipClauses = [{ userId: String(userId) }];
    if (cleanEmail) {
      ownershipClauses.push({ email: cleanEmail });
    }

    return await this.findPaginated(paginationParams, {
      filter: { $or: ownershipClauses },
      searchFields: ['subject', 'message', 'orderId'],
      defaultSort: { createdAt: -1 },
    });
  }
}
