import { BaseDTO } from '../core/BaseDTO.js';

/**
 * Product Review & Rating DTOs (Class-Based, SRP)
 */
export class CreateReviewRequestDTO extends BaseDTO {
  constructor(body = {}, authenticatedUser = null, product = {}) {
    super();
    this.productId = String(product.id || body.productId || '').trim();
    this.productSlug = String(product.slug || body.productSlug || '').trim().toLowerCase();
    this.userId = String(authenticatedUser?.id || body.userId || '').trim();
    this.customerName = String(
      body.customerName || body.authorName || authenticatedUser?.name || 'ROF Collector'
    ).trim();
    this.rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5));
    this.title = String(body.title || '').trim();
    this.comment = String(body.comment || '').trim();
    this.sizePurchased = body.sizePurchased ? String(body.sizePurchased).trim().toUpperCase() : '';
  }
}

export class ReviewResponseDTO extends BaseDTO {
  constructor(review = {}) {
    super();
    this.id = String(review.id);
    this.productId = String(review.productId);
    this.productSlug = String(review.productSlug);
    this.userId = String(review.userId);
    this.customerName = String(review.customerName || review.authorName || 'ROF Collector');
    this.authorName = this.customerName;
    this.rating = Number(review.rating);
    this.title = String(review.title || '');
    this.comment = String(review.comment);
    this.sizePurchased = String(review.sizePurchased || '');
    this.verifiedPurchase = Boolean(review.verifiedPurchase);
    this.createdAt = review.createdAt;
  }
}
