import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { WishlistResponseDTO } from '../dtos/wishlist.dto.js';

/**
 * Customer Wishlist / Saved Pieces Service (Class-Based, SOLID - SRP & DIP)
 */
export class WishlistService extends BaseService {
  constructor(wishlistRepository, productRepository, auditService) {
    super(wishlistRepository, auditService);
    this.productRepository = productRepository;
  }

  async getWishlist(authenticatedUser) {
    if (!authenticatedUser) {
      throw AppError.unauthorized('Please log in to view your saved pieces');
    }

    const wishlist = await this.repository.findByUserId(authenticatedUser.id);
    const productIds = wishlist?.productIds || [];
    const products = await this.productRepository.findByIds(productIds, {
      onlyPublished: true,
    });

    return new WishlistResponseDTO({
      userId: authenticatedUser.id,
      productIds,
      products,
    });
  }

  async addProduct(authenticatedUser, productIdOrSlug) {
    if (!authenticatedUser) {
      throw AppError.unauthorized('Please log in to save pieces to your wishlist');
    }

    const product = await this.productRepository.findBySlugOrId(productIdOrSlug, {
      onlyPublished: true,
    });
    if (!product) {
      throw AppError.notFound('Product', productIdOrSlug);
    }

    const updated = await this.repository.addProduct(authenticatedUser.id, product.id);
    const products = await this.productRepository.findByIds(updated.productIds, {
      onlyPublished: true,
    });

    return new WishlistResponseDTO({
      userId: authenticatedUser.id,
      productIds: updated.productIds,
      products,
    });
  }

  async removeProduct(authenticatedUser, productIdOrSlug) {
    if (!authenticatedUser) {
      throw AppError.unauthorized('Please log in to manage your wishlist');
    }

    const product = await this.productRepository.findBySlugOrId(productIdOrSlug, {
      onlyPublished: false,
    });
    const targetId = product ? product.id : productIdOrSlug;

    const updated = await this.repository.removeProduct(authenticatedUser.id, targetId);
    const products = await this.productRepository.findByIds(updated.productIds, {
      onlyPublished: true,
    });

    return new WishlistResponseDTO({
      userId: authenticatedUser.id,
      productIds: updated.productIds,
      products,
    });
  }

  async toggleProduct(authenticatedUser, productIdOrSlug) {
    if (!authenticatedUser) {
      throw AppError.unauthorized('Please log in to manage your wishlist');
    }

    const product = await this.productRepository.findBySlugOrId(productIdOrSlug, {
      onlyPublished: true,
    });
    if (!product) {
      throw AppError.notFound('Product', productIdOrSlug);
    }

    const existing = await this.repository.findByUserId(authenticatedUser.id);
    const alreadySaved = (existing?.productIds || []).includes(product.id);

    const updated = alreadySaved
      ? await this.repository.removeProduct(authenticatedUser.id, product.id)
      : await this.repository.addProduct(authenticatedUser.id, product.id);

    const products = await this.productRepository.findByIds(updated.productIds, {
      onlyPublished: true,
    });

    return {
      added: !alreadySaved,
      wishlist: new WishlistResponseDTO({
        userId: authenticatedUser.id,
        productIds: updated.productIds,
        products,
      }),
    };
  }
}

