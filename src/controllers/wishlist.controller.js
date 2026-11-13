import { BaseController } from '../core/BaseController.js';

/**
 * Customer Wishlist Controller (Class-Based, SOLID - SRP & DIP)
 */
export class WishlistController extends BaseController {
  constructor(wishlistService) {
    super(wishlistService);
  }

  async getWishlist(req, res) {
    const wishlist = await this.service.getWishlist(req.user);
    return this.ok(res, wishlist, 'Wishlist retrieved successfully');
  }

  async addProduct(req, res) {
    const wishlist = await this.service.addProduct(req.user, req.params.productId);
    return this.ok(res, wishlist, 'Piece added to wishlist');
  }

  async removeProduct(req, res) {
    const wishlist = await this.service.removeProduct(req.user, req.params.productId);
    return this.ok(res, wishlist, 'Piece removed from wishlist');
  }

  async toggleProduct(req, res) {
    const result = await this.service.toggleProduct(req.user, req.params.productId);
    return this.ok(
      res,
      result,
      result.added ? 'Piece saved to wishlist' : 'Piece removed from wishlist'
    );
  }
}

