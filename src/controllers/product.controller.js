import { BaseController } from '../core/BaseController.js';
import { SaveProductRequestDTO, UpdateInventoryRequestDTO } from '../dtos/product.dto.js';

/**
 * Product, Cloudinary Image Upload & Inventory Controller (Class-Based, SOLID - SRP & DIP)
 */
export class ProductController extends BaseController {
  constructor(productService) {
    super(productService);
  }

  async getProducts(req, res) {
    const paginationParams = {
      ...this.getPaginationParams(req),
      category: req.query.category,
      colourKey: req.query.colourKey,
      size: req.query.size,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      featured: req.query.featured,
      isNewArrival: req.query.isNewArrival,
      isBestSeller: req.query.isBestSeller,
      inStock: req.query.inStock,
      tag: req.query.tag,
    };
    const isAdmin = Boolean(req.user && (req.user.role === 'Owner' || req.user.role === 'Staff'));
    const result = await this.service.getProducts(paginationParams, { isAdmin });
    return this.paginated(res, result, 'Products retrieved successfully');
  }

  async getProductBySlug(req, res) {
    const isAdmin = Boolean(req.user && (req.user.role === 'Owner' || req.user.role === 'Staff'));
    const product = await this.service.getProductBySlugOrId(req.params.slug, { isAdmin });
    return this.ok(res, product, 'Product retrieved successfully');
  }

  async getRelatedProducts(req, res) {
    const limit = Math.min(12, Math.max(1, parseInt(req.query.limit, 10) || 4));
    const related = await this.service.getRelatedProducts(req.params.slug, limit);
    return this.ok(res, related, 'Related products retrieved successfully');
  }

  async saveProduct(req, res) {
    const dto = SaveProductRequestDTO.fromEntity({
      ...req.body,
      ...(req.params.id ? { id: req.params.id } : {}),
    });
    const actor = req.user?.name || 'Owner';
    const saved = await this.service.saveProduct(dto, actor, req.uploadedFiles || []);
    return this.ok(res, saved, 'Product and Cloudinary images saved successfully');
  }

  /**
   * Upload one or more images to Cloudinary and save the URLs in the product
   */
  async uploadProductImages(req, res) {
    const actor = req.user?.name || 'Owner';
    const replace = String(req.body?.replace ?? req.query?.replace) === 'true';
    const files = req.uploadedFiles?.length
      ? req.uploadedFiles
      : req.body?.images || req.body?.files || (req.body?.file ? [req.body.file] : []);

    const result = await this.service.uploadProductImages(req.params.id, files, {
      replace,
      actorName: actor,
    });
    return this.ok(res, result, 'Product images uploaded to Cloudinary and saved to product');
  }

  /**
   * Remove a specific Cloudinary image from a product
   */
  async deleteProductImage(req, res) {
    const actor = req.user?.name || 'Owner';
    const publicId = req.body?.publicId || req.query?.publicId;
    const url = req.body?.url || req.query?.url;
    const updatedProduct = await this.service.deleteProductImage(
      req.params.id,
      { publicId, url },
      actor
    );
    return this.ok(res, updatedProduct, 'Product image deleted from Cloudinary and product');
  }

  /**
   * Standalone Cloudinary upload endpoint for Studio Admin (/api/v1/admin/upload)
   */
  async uploadMediaToCloudinary(req, res) {
    const folder = req.body?.folder || 'rof_rage/products';
    const files = req.uploadedFiles?.length
      ? req.uploadedFiles
      : req.body?.images || req.body?.files || (req.body?.file ? [req.body.file] : []);

    const uploaded = await this.service.cloudinaryService.uploadMultipleImages(files, {
      folder,
      publicIdPrefix: req.body?.publicIdPrefix || 'studio',
    });
    return this.created(res, {
      files: uploaded,
      urls: uploaded.map((item) => item.url),
    }, 'Images uploaded to Cloudinary successfully');
  }

  /**
   * Generate signed Cloudinary upload parameters for client-direct uploads
   */
  async getCloudinarySignature(req, res) {
    const folder = req.query?.folder || 'rof_rage/products';
    const publicId = req.query?.publicId;
    const signatureData = this.service.cloudinaryService.generateUploadSignature({
      folder,
      publicId,
    });
    return this.ok(res, signatureData, 'Cloudinary upload signature generated');
  }

  async updateInventory(req, res) {
    const dto = UpdateInventoryRequestDTO.fromEntity({
      ...req.body,
      ...(req.params.id ? { productId: req.params.id } : {}),
    });
    const actor = req.user?.name || 'Staff';
    const updated = await this.service.updateInventory(dto, actor);
    return this.ok(res, updated, 'Inventory stock updated successfully');
  }

  async deleteProduct(req, res) {
    const actor = req.user?.name || 'Owner';
    await this.service.deleteProduct(req.params.id, actor);
    return this.noContent(res);
  }
}
