import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { ProductResponseDTO } from '../dtos/product.dto.js';
import { CloudinaryService } from './cloudinary.service.js';

/**
 * Product, Cloudinary Media & Inventory Service (Class-Based, SOLID - SRP & DIP)
 */
export class ProductService extends BaseService {
  constructor(productRepository, auditService, cloudinaryService = new CloudinaryService()) {
    super(productRepository, auditService);
    this.cloudinaryService = cloudinaryService;
  }

  /**
   * List products with pagination, search, category/size/colour/price filtering, and visibility scoping
   * Public users only see published=true products unless authenticated as Admin/Staff.
   */
  async getProducts(paginationParams = {}, { isAdmin = false } = {}) {
    const filter = this.repository.buildCatalogFilter
      ? this.repository.buildCatalogFilter(paginationParams, { isAdmin })
      : !isAdmin
        ? { published: true }
        : {};

    const result = await this.repository.findPaginated(
      {
        ...paginationParams,
        sortBy: paginationParams.sortBy || 'position',
        sortOrder: paginationParams.sortOrder || 'asc',
      },
      {
        filter,
        searchFields: ['name', 'slug', 'colour', 'print', 'blurb', 'categoryName', 'tags'],
        defaultSort: { position: 1 },
      }
    );

    return {
      data: ProductResponseDTO.fromEntities(result.data),
      meta: result.meta,
    };
  }

  /**
   * Retrieve a single product by slug or ID.
   * Enforces IDOR visibility scope: unpublished products cannot be accessed by unauthenticated callers.
   */
  async getProductBySlugOrId(slugOrId, { isAdmin = false } = {}) {
    const product = await this.repository.findBySlugOrId(slugOrId, {
      onlyPublished: !isAdmin,
    });

    if (!product) {
      throw AppError.notFound('Product', slugOrId);
    }

    return ProductResponseDTO.fromEntity(product);
  }

  /**
   * Retrieve related / paired pieces for a product (Storefront Product Detail & Recommendations)
   */
  async getRelatedProducts(slugOrId, limit = 4) {
    const product = await this.repository.findBySlugOrId(slugOrId, { onlyPublished: true });
    if (!product) {
      throw AppError.notFound('Product', slugOrId);
    }

    const related = await this.repository.findRelatedProducts(product, limit);
    return ProductResponseDTO.fromEntities(related);
  }

  /**
   * Create or update a product in the catalog (Admin/Owner).
   * Automatically uploads any provided image files / base64 images to Cloudinary
   * and saves the resulting Cloudinary URLs in the product document.
   */
  async saveProduct(saveProductDto, actorName = 'Owner', uploadedFiles = []) {
    const existing = await this.repository.findById(saveProductDto.id);

    // Collect any raw files or base64 data URIs that should be uploaded to Cloudinary
    const filesToUpload = [
      ...(Array.isArray(uploadedFiles) ? uploadedFiles : []),
      ...(Array.isArray(saveProductDto.imageFiles) ? saveProductDto.imageFiles : []),
    ];

    const inlineUploadable = (saveProductDto.images || []).filter(
      (img) =>
        typeof img === 'string' &&
        (img.startsWith('data:image/') ||
          (img.startsWith('http') && !img.includes('res.cloudinary.com/')))
    );

    const allUploadInputs = [...filesToUpload, ...inlineUploadable];

    let finalImages = Array.isArray(saveProductDto.images)
      ? saveProductDto.images.filter((img) => !img.startsWith('data:image/'))
      : [];
    let finalCloudinaryImages = Array.isArray(saveProductDto.cloudinaryImages)
      ? [...saveProductDto.cloudinaryImages]
      : existing?.cloudinaryImages || [];

    if (allUploadInputs.length > 0) {
      const uploadedAssets = await this.cloudinaryService.uploadMultipleImages(allUploadInputs, {
        folder: 'rof_rage/products',
        publicIdPrefix: saveProductDto.slug || saveProductDto.id,
      });

      const uploadedUrls = uploadedAssets.map((a) => a.url);
      finalImages = Array.from(
        new Set([
          ...finalImages.filter((u) => u !== '/images/placeholder.webp'),
          ...uploadedUrls,
        ])
      );
      finalCloudinaryImages = [...finalCloudinaryImages, ...uploadedAssets];
    }

    if (finalImages.length === 0) {
      finalImages = existing?.images?.length ? existing.images : ['/images/placeholder.webp'];
    }

    const primaryCloudUrl = finalCloudinaryImages.find((a) => a.isPrimary)?.url;
    const thumbnailUrl =
      primaryCloudUrl ||
      (saveProductDto.thumbnailUrl &&
      saveProductDto.thumbnailUrl !== '/images/placeholder.webp' &&
      !saveProductDto.thumbnailUrl.startsWith('data:image/')
        ? saveProductDto.thumbnailUrl
        : finalImages[0]);

    const payloadToSave = {
      ...saveProductDto,
      images: finalImages,
      cloudinaryImages: finalCloudinaryImages,
      thumbnailUrl,
    };
    delete payloadToSave.imageFiles;

    const saved = await this.repository.save(payloadToSave);

    await this.recordAudit({
      action: existing ? 'Product Updated' : 'Product Created',
      entity: 'Product',
      entityId: saved.id,
      user: actorName,
      details: `${existing ? 'Updated' : 'Created'} piece "${saved.name}" (${saved.colour}) at NGN ${saved.price} with ${saved.images?.length || 0} image(s)`,
    });

    return ProductResponseDTO.fromEntity(saved);
  }

  /**
   * Upload one or more images to Cloudinary and save their URLs directly in the product
   */
  async uploadProductImages(
    productId,
    files = [],
    { replace = false, actorName = 'Owner' } = {}
  ) {
    const existing = await this.repository.findBySlugOrId(productId);
    if (!existing) {
      throw AppError.notFound('Product', productId);
    }

    if (!Array.isArray(files) || files.length === 0) {
      throw AppError.badRequest('At least one image file or base64 data URI is required');
    }

    const uploadedAssets = await this.cloudinaryService.uploadMultipleImages(files, {
      folder: 'rof_rage/products',
      publicIdPrefix: existing.slug || existing.id,
    });

    const updated = await this.repository.saveProductImages(existing.id, uploadedAssets, {
      replace: Boolean(replace),
    });

    await this.recordAudit({
      action: 'Product Images Uploaded',
      entity: 'Product',
      entityId: existing.id,
      user: actorName,
      details: `Uploaded ${uploadedAssets.length} image(s) to Cloudinary and saved URLs on "${existing.name}"`,
    });

    return {
      product: ProductResponseDTO.fromEntity(updated),
      uploadedImages: uploadedAssets,
    };
  }

  /**
   * Remove an image from a product and delete the asset from Cloudinary
   */
  async deleteProductImage(productId, { publicId, url } = {}, actorName = 'Owner') {
    const existing = await this.repository.findBySlugOrId(productId);
    if (!existing) {
      throw AppError.notFound('Product', productId);
    }

    if (!publicId && !url) {
      throw AppError.badRequest('Provide either publicId or image url to remove');
    }

    const matchedAsset = (existing.cloudinaryImages || []).find(
      (a) => (publicId && a.publicId === publicId) || (url && a.url === url)
    );

    const targetPublicId = publicId || matchedAsset?.publicId;
    if (targetPublicId) {
      await this.cloudinaryService.deleteImage(targetPublicId);
    }

    const updated = await this.repository.removeProductImage(existing.id, {
      publicId: targetPublicId,
      url: url || matchedAsset?.url,
    });

    await this.recordAudit({
      action: 'Product Image Removed',
      entity: 'Product',
      entityId: existing.id,
      user: actorName,
      details: `Removed image (${targetPublicId || url}) from "${existing.name}"`,
    });

    return ProductResponseDTO.fromEntity(updated);
  }

  /**
   * Adjust stock of a specific size variant (Admin/Staff)
   */
  async updateInventory(updateInventoryDto, actorName = 'Owner') {
    const { productId, size, stock } = updateInventoryDto;
    const existing = await this.repository.findById(productId);
    if (!existing) {
      throw AppError.notFound('Product', productId);
    }

    const updated = await this.repository.updateVariantStock(productId, size, stock);
    if (!updated) {
      throw AppError.badRequest(`Variant size '${size}' not found on product ${productId}`);
    }

    await this.recordAudit({
      action: 'Inventory Adjustment',
      entity: 'Product',
      entityId: productId,
      user: actorName,
      details: `Adjusted stock for ${existing.name} (${size}) to ${stock} units`,
    });

    return ProductResponseDTO.fromEntity(updated);
  }

  /**
   * Delete a product by ID and clean up its Cloudinary assets (Owner only)
   */
  async deleteProduct(productId, actorName = 'Owner') {
    const existing = await this.repository.findById(productId);
    if (!existing) {
      throw AppError.notFound('Product', productId);
    }

    for (const asset of existing.cloudinaryImages || []) {
      if (asset?.publicId) {
        await this.cloudinaryService.deleteImage(asset.publicId);
      }
    }

    await this.repository.deleteById(productId);

    await this.recordAudit({
      action: 'Product Deleted',
      entity: 'Product',
      entityId: productId,
      user: actorName,
      details: `Removed product "${existing.name}" from catalog`,
    });

    return true;
  }
}
