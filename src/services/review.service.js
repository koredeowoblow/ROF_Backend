import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { CreateReviewRequestDTO, ReviewResponseDTO } from '../dtos/review.dto.js';

/**
 * Product Review & Verified Rating Service (Class-Based, SOLID - SRP & DIP)
 */
export class ReviewService extends BaseService {
  constructor(reviewRepository, productRepository, orderRepository, auditService) {
    super(reviewRepository, auditService);
    this.productRepository = productRepository;
    this.orderRepository = orderRepository;
  }

  /**
   * List paginated reviews for a product
   */
  async getProductReviews(slugOrId, paginationParams = {}) {
    const product = await this.productRepository.findBySlugOrId(slugOrId, {
      onlyPublished: false,
    });
    if (!product) {
      throw AppError.notFound('Product', slugOrId);
    }

    const result = await this.repository.findByProduct(product.id, paginationParams);
    return {
      data: ReviewResponseDTO.fromEntities(result.data),
      meta: result.meta,
    };
  }

  /**
   * Submit a customer review for a product, automatically checking verified purchase status
   * and recalculating the product's average star rating.
   */
  async createReview(slugOrId, body, authenticatedUser) {
    if (!authenticatedUser) {
      throw AppError.unauthorized('Please log in to submit a product review');
    }

    const product = await this.productRepository.findBySlugOrId(slugOrId, {
      onlyPublished: true,
    });
    if (!product) {
      throw AppError.notFound('Product', slugOrId);
    }

    const existingReview = await this.repository.findByUserAndProduct(
      authenticatedUser.id,
      product.id
    );
    if (existingReview) {
      throw AppError.conflict('You have already submitted a review for this piece');
    }

    const dto = new CreateReviewRequestDTO(body, authenticatedUser, product);

    // Check if the user has purchased this product in any confirmed/delivered order
    let verifiedPurchase = false;
    if (this.orderRepository?.findPaginatedByUser) {
      const userOrders = await this.orderRepository.findPaginatedByUser(
        authenticatedUser.id,
        authenticatedUser.email,
        { page: 1, limit: 100 }
      );
      verifiedPurchase = (userOrders.data || []).some(
        (order) =>
          order.status !== 'cancelled' &&
          (order.items || []).some((item) => item.productId === product.id)
      );
    }

    const created = await this.repository.create({
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...dto,
      verifiedPurchase,
      createdAt: new Date().toISOString(),
    });

    const stats = await this.repository.computeProductRatingStats(product.id);
    await this.productRepository.updateRatingSummary(product.id, stats);

    return ReviewResponseDTO.fromEntity(created);
  }

  /**
   * Delete a review (Owner/Staff or the review author) and recalculate product rating
   */
  async deleteReview(reviewId, requester) {
    const existing = await this.repository.findById(reviewId);
    if (!existing) {
      throw AppError.notFound('Review', reviewId);
    }

    const isAdminOrStaff =
      requester && (requester.role === 'Owner' || requester.role === 'Staff');
    const isAuthor = requester && String(existing.userId) === String(requester.id);

    if (!isAdminOrStaff && !isAuthor) {
      throw AppError.idor('IDOR Protection: You can only delete your own review');
    }

    await this.repository.deleteById(reviewId);

    const stats = await this.repository.computeProductRatingStats(existing.productId);
    await this.productRepository.updateRatingSummary(existing.productId, stats);

    await this.recordAudit({
      action: 'Review Deleted',
      entity: 'Review',
      entityId: reviewId,
      user: requester?.name || 'Owner',
      details: `Deleted review on product ${existing.productId}`,
    });

    return true;
  }
}

