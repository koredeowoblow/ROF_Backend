import { BaseRepository } from '../core/BaseRepository.js';
import { DiscountModel } from '../models/discount.model.js';

/**
 * Discount Voucher MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class DiscountRepository extends BaseRepository {
  constructor(model = DiscountModel) {
    super(model, 'id');
  }

  async findActiveByCode(code) {
    const cleanCode = String(code || '').trim().toUpperCase();
    return await this.findOne({ code: cleanCode, active: true });
  }

  async incrementUsage(discountId) {
    const updated = await this.model
      .findOneAndUpdate(
        this.buildIdFilter(discountId),
        { $inc: { usedCount: 1 } },
        { new: true }
      )
      .lean()
      .exec();

    return this.normalizeDoc(updated);
  }
}
