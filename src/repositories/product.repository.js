import { BaseRepository } from '../core/BaseRepository.js';
import { ProductModel } from '../models/product.model.js';

/**
 * Product MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class ProductRepository extends BaseRepository {
  constructor(model = ProductModel) {
    super(model, 'id');
  }

  /**
   * Find product by slug or id, optionally scoped to published=true (IDOR protection for draft products)
   */
  async findBySlugOrId(slugOrId, { onlyPublished = false } = {}) {
    const clean = String(slugOrId || '').trim();
    const lower = clean.toLowerCase();
    const filter = {
      $or: [{ slug: lower }, { id: clean }],
      ...(onlyPublished ? { published: true } : {}),
    };
    return await this.findOne(filter);
  }

  /**
   * Find multiple products by an array of product IDs
   */
  async findByIds(productIds = [], { onlyPublished = true } = {}) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return [];
    }
    return await this.findAll({
      id: { $in: productIds },
      ...(onlyPublished ? { published: true } : {}),
    });
  }

  /**
   * Save Cloudinary uploaded image URLs & metadata directly on the product
   */
  async saveProductImages(productId, uploadedAssets = [], { replace = false } = {}) {
    const existing = await this.findById(productId);
    if (!existing) return null;

    const existingCloudinary = Array.isArray(existing.cloudinaryImages)
      ? existing.cloudinaryImages
      : [];
    const existingUrls = Array.isArray(existing.images)
      ? existing.images.filter((img) => img !== '/images/placeholder.webp')
      : [];

    const mergedCloudinary = replace
      ? uploadedAssets
      : [...existingCloudinary, ...uploadedAssets];

    const newUrls = uploadedAssets.map((a) => a.url || a.secureUrl).filter(Boolean);
    const mergedUrls = replace
      ? newUrls
      : Array.from(new Set([...existingUrls, ...newUrls]));

    const finalImages = mergedUrls.length > 0 ? mergedUrls : ['/images/placeholder.webp'];
    const primaryAsset =
      mergedCloudinary.find((a) => a.isPrimary) || mergedCloudinary[0] || null;
    const thumbnailUrl = primaryAsset?.url || finalImages[0] || '/images/placeholder.webp';

    return await this.updateById(productId, {
      images: finalImages,
      cloudinaryImages: mergedCloudinary,
      thumbnailUrl,
    });
  }

  /**
   * Remove a specific Cloudinary image from a product by publicId or URL
   */
  async removeProductImage(productId, { publicId, url } = {}) {
    const existing = await this.findById(productId);
    if (!existing) return null;

    const remainingCloudinary = (existing.cloudinaryImages || []).filter(
      (asset) =>
        (publicId ? asset.publicId !== publicId : true) &&
        (url ? asset.url !== url : true)
    );

    const removedUrls = new Set(
      (existing.cloudinaryImages || [])
        .filter((asset) => publicId && asset.publicId === publicId)
        .map((asset) => asset.url)
    );
    if (url) removedUrls.add(url);

    const remainingUrls = (existing.images || []).filter((imgUrl) => !removedUrls.has(imgUrl));
    const finalImages = remainingUrls.length > 0 ? remainingUrls : ['/images/placeholder.webp'];
    const thumbnailUrl =
      remainingCloudinary.find((a) => a.isPrimary)?.url ||
      finalImages[0] ||
      '/images/placeholder.webp';

    return await this.updateById(productId, {
      images: finalImages,
      cloudinaryImages: remainingCloudinary,
      thumbnailUrl,
    });
  }

  /**
   * Build MongoDB filter from storefront query parameters (category, colourKey, size, price range, inStock, featured)
   */
  buildCatalogFilter(queryParams = {}, { isAdmin = false, categoryFilter = null } = {}) {
    const filter = {};

    if (!isAdmin) {
      filter.published = true;
    } else if (queryParams.published !== undefined) {
      filter.published = String(queryParams.published) === 'true';
    }

    if (categoryFilter) {
      const catClean = String(categoryFilter).trim();
      const catLower = catClean.toLowerCase();
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ categorySlug: catLower }, { categoryId: catClean }],
      });
    } else if (queryParams.category) {
      const catClean = String(queryParams.category).trim();
      const catLower = catClean.toLowerCase();
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ categorySlug: catLower }, { categoryId: catClean }],
      });
    }

    if (queryParams.colourKey) {
      filter.colourKey = String(queryParams.colourKey).toLowerCase();
    }

    if (queryParams.featured !== undefined) {
      filter.featured = String(queryParams.featured) === 'true';
    }

    if (queryParams.isNewArrival !== undefined) {
      filter.isNewArrival = String(queryParams.isNewArrival) === 'true';
    }

    if (queryParams.isBestSeller !== undefined) {
      filter.isBestSeller = String(queryParams.isBestSeller) === 'true';
    }

    if (queryParams.tag) {
      filter.tags = String(queryParams.tag).trim();
    }

    if (queryParams.minPrice !== undefined || queryParams.maxPrice !== undefined) {
      filter.price = {};
      if (queryParams.minPrice !== undefined) {
        filter.price.$gte = Number(queryParams.minPrice) || 0;
      }
      if (queryParams.maxPrice !== undefined) {
        filter.price.$lte = Number(queryParams.maxPrice) || Number.MAX_SAFE_INTEGER;
      }
    }

    if (queryParams.size) {
      const targetSize = String(queryParams.size).toUpperCase();
      filter.variants = {
        $elemMatch: {
          size: targetSize,
          stock: { $gt: 0 },
        },
      };
    } else if (String(queryParams.inStock) === 'true') {
      filter['variants.stock'] = { $gt: 0 };
    }

    return filter;
  }

  /**
   * Compute category facet metadata (available sizes, colourways, min/max price, total pieces)
   */
  async getCategoryFacets(categorySlugOrId, { onlyPublished = true } = {}) {
    const filter = this.buildCatalogFilter({}, { isAdmin: !onlyPublished, categoryFilter: categorySlugOrId });
    const pieces = await this.findAll(filter, { position: 1 });

    const sizeSet = new Set();
    const colourMap = new Map();
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const p of pieces) {
      if (p.price < minPrice) minPrice = p.price;
      if (p.price > maxPrice) maxPrice = p.price;
      if (p.colourKey) {
        colourMap.set(p.colourKey, {
          colourKey: p.colourKey,
          colour: p.colour,
          swatch: p.swatch || '#141312',
        });
      }
      for (const v of p.variants || []) {
        if (v.stock > 0) sizeSet.add(v.size);
      }
    }

    return {
      totalPieces: pieces.length,
      availableSizes: Array.from(sizeSet),
      availableColours: Array.from(colourMap.values()),
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice,
      },
    };
  }

  /**
   * Find related / paired products for a given product
   */
  async findRelatedProducts(product, limit = 4) {
    if (!product) return [];
    const results = [];

    if (product.pairId) {
      const pairPiece = await this.findOne({ id: product.pairId, published: true });
      if (pairPiece) {
        results.push(pairPiece);
      }
    }

    const others = await this.findAll(
      {
        id: { $nin: [product.id, ...(product.pairId ? [product.pairId] : [])] },
        published: true,
      },
      { position: 1 }
    );

    const sameCategory = others.filter((p) => p.categorySlug === product.categorySlug);
    const remaining = others.filter((p) => p.categorySlug !== product.categorySlug);

    return [...results, ...sameCategory, ...remaining].slice(0, limit);
  }

  /**
   * Update aggregated review rating and count on a product
   */
  async updateRatingSummary(productId, { ratingAverage, reviewCount }) {
    return await this.updateById(productId, {
      ratingAverage: Number(Number(ratingAverage || 0).toFixed(2)),
      reviewCount: Math.max(0, parseInt(reviewCount, 10) || 0),
    });
  }

  /**
   * Update stock of a specific size variant in MongoDB
   */
  async updateVariantStock(productId, size, newStock) {
    const normalizedSize = String(size || '').toUpperCase();
    const safeStock = Math.max(0, parseInt(newStock, 10) || 0);

    const updated = await this.model
      .findOneAndUpdate(
        { ...this.buildIdFilter(productId), 'variants.size': normalizedSize },
        { $set: { 'variants.$.stock': safeStock } },
        { new: true, runValidators: true }
      )
      .lean()
      .exec();

    return this.normalizeDoc(updated);
  }

  /**
   * Atomically decrement stock for a variant in MongoDB (only if stock >= qty)
   */
  async decrementVariantStock(productId, size, qty) {
    const normalizedSize = String(size || '').toUpperCase();
    const updated = await this.model
      .findOneAndUpdate(
        {
          ...this.buildIdFilter(productId),
          variants: { $elemMatch: { size: normalizedSize, stock: { $gte: qty } } },
        },
        { $inc: { 'variants.$.stock': -qty } },
        { new: true }
      )
      .lean()
      .exec();

    return this.normalizeDoc(updated);
  }
}
