import { BaseRepository } from '../core/BaseRepository.js';
import { WishlistModel } from '../models/wishlist.model.js';

/**
 * Customer Wishlist MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class WishlistRepository extends BaseRepository {
  constructor(model = WishlistModel) {
    super(model, 'id');
  }

  async findByUserId(userId) {
    return await this.findOne({ userId });
  }

  async addProduct(userId, productId) {
    const existing = await this.findByUserId(userId);
    if (!existing) {
      return await this.create({
        id: `wish-${userId}`,
        userId,
        productIds: [productId],
      });
    }

    const set = new Set(existing.productIds || []);
    set.add(productId);
    return await this.updateById(existing.id, { productIds: Array.from(set) });
  }

  async removeProduct(userId, productId) {
    const existing = await this.findByUserId(userId);
    if (!existing) {
      return { id: `wish-${userId}`, userId, productIds: [] };
    }

    const filtered = (existing.productIds || []).filter((id) => id !== productId);
    return await this.updateById(existing.id, { productIds: filtered });
  }
}

