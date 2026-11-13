import { BaseDTO } from '../core/BaseDTO.js';

/**
 * Product & Cloudinary Asset Domain DTOs (Class-Based, SRP & ISP)
 */
export class ProductVariantDTO extends BaseDTO {
  constructor(variant = {}) {
    super();
    this.size = String(variant.size || '').toUpperCase();
    this.stock = Math.max(0, parseInt(variant.stock, 10) || 0);
  }
}

export class CloudinaryImageDTO extends BaseDTO {
  constructor(asset = {}) {
    super();
    this.url = String(asset.url || asset.secureUrl || '').trim();
    this.publicId = String(asset.publicId || '').trim();
    this.format = String(asset.format || 'webp').toLowerCase();
    this.width = Number(asset.width || 1200);
    this.height = Number(asset.height || 1500);
    this.isPrimary = Boolean(asset.isPrimary);
  }
}

export class ProductResponseDTO extends BaseDTO {
  constructor(product = {}) {
    super();
    this.id = String(product.id);
    this.slug = String(product.slug);
    this.name = String(product.name);
    this.categoryId = String(product.categoryId || 'cat-heavyweight-tees');
    this.categorySlug = String(product.categorySlug || 'heavyweight-tees');
    this.categoryName = String(product.categoryName || 'Heavyweight Tees');
    this.colour = String(product.colour);
    this.colourKey = product.colourKey || 'black';
    this.swatch = product.swatch || '#141312';
    this.print = String(product.print || '');
    this.price = Number(product.price);
    this.compareAtPrice = product.compareAtPrice ? Number(product.compareAtPrice) : null;
    this.blurb = String(product.blurb || '');
    this.ground = product.ground === 'ink' ? 'ink' : 'bone';
    this.zoomOrigin = product.zoomOrigin || '50% 50%';
    this.images = Array.isArray(product.images) ? [...product.images] : [];
    this.cloudinaryImages = CloudinaryImageDTO.fromEntities(product.cloudinaryImages || []);
    this.thumbnailUrl =
      product.thumbnailUrl ||
      this.cloudinaryImages.find((img) => img.isPrimary)?.url ||
      this.images[0] ||
      '/images/placeholder.webp';
    this.tags = Array.isArray(product.tags) ? product.tags.map(String) : [];
    this.featured = Boolean(product.featured);
    this.isNewArrival = Boolean(product.isNewArrival);
    this.isBestSeller = Boolean(product.isBestSeller);
    this.ratingAverage = Number(product.ratingAverage || 0);
    this.reviewCount = Number(product.reviewCount || 0);
    if (product.pairId) {
      this.pairId = String(product.pairId);
    }
    this.position = Number(product.position || 1);
    this.published = Boolean(product.published);
    this.variants = ProductVariantDTO.fromEntities(product.variants || []);
    this.totalStock = this.variants.reduce((sum, v) => sum + v.stock, 0);
    this.inStock = this.totalStock > 0;
  }
}

export class SaveProductRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    const picked = BaseDTO.pick(body, [
      'id',
      'slug',
      'name',
      'categoryId',
      'categorySlug',
      'categoryName',
      'colour',
      'colourKey',
      'swatch',
      'print',
      'price',
      'compareAtPrice',
      'blurb',
      'ground',
      'zoomOrigin',
      'thumbnailUrl',
      'images',
      'cloudinaryImages',
      'imageFiles',
      'tags',
      'featured',
      'isNewArrival',
      'isBestSeller',
      'pairId',
      'position',
      'published',
      'variants',
    ]);

    this.id = picked.id ? String(picked.id).trim() : `prod-${Date.now()}`;
    this.name = String(picked.name || '').trim();
    this.slug = picked.slug
      ? String(picked.slug).trim().toLowerCase()
      : this.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

    this.categoryName = String(picked.categoryName || 'Heavyweight Tees').trim();
    this.categorySlug = picked.categorySlug
      ? String(picked.categorySlug).trim().toLowerCase()
      : this.categoryName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
    this.categoryId = picked.categoryId
      ? String(picked.categoryId).trim()
      : `cat-${this.categorySlug}`;

    this.colour = String(picked.colour || 'Black').trim();
    this.colourKey = ['green', 'white', 'black'].includes(picked.colourKey)
      ? picked.colourKey
      : this.colour.toLowerCase().includes('green')
        ? 'green'
        : this.colour.toLowerCase().includes('white')
          ? 'white'
          : 'black';
    this.swatch = picked.swatch || '#141312';
    this.print = String(picked.print || '').trim();
    this.price = Number(picked.price);
    this.compareAtPrice = picked.compareAtPrice ? Number(picked.compareAtPrice) : null;
    this.blurb = String(picked.blurb || '').trim();
    this.ground = picked.ground === 'ink' ? 'ink' : 'bone';
    this.zoomOrigin = picked.zoomOrigin || '50% 50%';
    this.images =
      Array.isArray(picked.images) && picked.images.length > 0
        ? picked.images.map(String)
        : ['/images/placeholder.webp'];
    this.cloudinaryImages = Array.isArray(picked.cloudinaryImages)
      ? CloudinaryImageDTO.fromEntities(picked.cloudinaryImages)
      : [];
    this.imageFiles = Array.isArray(picked.imageFiles) ? picked.imageFiles : [];
    this.thumbnailUrl = picked.thumbnailUrl ? String(picked.thumbnailUrl).trim() : this.images[0];
    this.tags = Array.isArray(picked.tags)
      ? picked.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    this.featured = Boolean(picked.featured);
    this.isNewArrival = Boolean(picked.isNewArrival);
    this.isBestSeller = Boolean(picked.isBestSeller);
    if (picked.pairId) {
      this.pairId = String(picked.pairId);
    }
    this.position = Number(picked.position || 1);
    this.published = picked.published !== undefined ? Boolean(picked.published) : true;
    this.variants = ProductVariantDTO.fromEntities(
      Array.isArray(picked.variants) && picked.variants.length > 0
        ? picked.variants
        : [
            { size: 'S', stock: 0 },
            { size: 'M', stock: 0 },
            { size: 'L', stock: 0 },
            { size: 'XL', stock: 0 },
            { size: 'XXL', stock: 0 },
          ]
    );
  }
}

export class UpdateInventoryRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.productId = String(body.productId || '').trim();
    this.size = String(body.size || '').trim().toUpperCase();
    this.stock = Math.max(0, parseInt(body.stock ?? body.newStock, 10) || 0);
  }
}
