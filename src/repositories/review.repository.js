import { BaseRepository } from '../core/BaseRepository.js';
import { ReviewModel } from '../models/review.model.js';

/**
 * Product Review MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class ReviewRepository extends BaseRepository {
  constructor(model = ReviewModel) {
    super(model, 'id');
  }

  async findByProduct(productId, paginationParams = {}) {
    return await this.findPaginated(paginationParams, {
      filter: { productId },
      searchFields: ['customerName', 'title', 'comment'],
      defaultSort: { createdAt: -1 },
    });
  }

  async findByUserAndProduct(userId, productId) {
    return await this.findOne({ userId, productId });
  }

  async computeProductRatingStats(productId) {
    const allReviews = await this.findAll({ productId });
    if (allReviews.length === 0) {
      return { ratingAverage: 0, reviewCount: 0 };
    }
    const sum = allReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return {
      ratingAverage: Number((sum / allReviews.length).toFixed(2)),
      reviewCount: allReviews.length,
    };
  }
}

