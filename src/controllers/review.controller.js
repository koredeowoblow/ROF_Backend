import { BaseController } from '../core/BaseController.js';

/**
 * Product Review & Rating Controller (Class-Based, SOLID - SRP & DIP)
 */
export class ReviewController extends BaseController {
  constructor(reviewService) {
    super(reviewService);
  }

  async getProductReviews(req, res) {
    const paginationParams = this.getPaginationParams(req);
    const result = await this.service.getProductReviews(req.params.slug, paginationParams);
    return this.paginated(res, result, 'Product reviews retrieved successfully');
  }

  async createReview(req, res) {
    const review = await this.service.createReview(req.params.slug, req.body, req.user);
    return this.created(res, review, 'Review submitted successfully');
  }

  async deleteReview(req, res) {
    await this.service.deleteReview(req.params.id, req.user);
    return this.noContent(res);
  }
}

