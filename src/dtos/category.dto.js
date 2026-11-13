import { BaseDTO } from '../core/BaseDTO.js';
import { ProductResponseDTO } from './product.dto.js';

/**
 * Category & Category Page Domain DTOs (Class-Based, SRP & ISP)
 */
export class CategoryResponseDTO extends BaseDTO {
  constructor(category = {}) {
    super();
    this.id = String(category.id);
    this.name = String(category.name);
    this.slug = String(category.slug);
    this.headline = String(category.headline || category.subtitle || '');
    this.subtitle = this.headline;
    this.description = String(category.description || '');
    this.bannerImage = String(
      category.bannerImage || category.bannerImageUrl || '/images/destined-cards-green.webp'
    );
    this.bannerImageUrl = this.bannerImage;
    this.bannerPublicId = String(category.bannerPublicId || '');
    this.featured = Boolean(category.featured);
    this.active = category.active !== undefined ? Boolean(category.active) : true;
    this.position = Number(category.position || 1);
    this.productCount = Number(category.productCount || 0);
    this.metaTitle = String(category.metaTitle || `${this.name} — ROF RAGE`);
    this.metaDescription = String(category.metaDescription || this.description || '');
  }
}

export class CategoryPageResponseDTO extends BaseDTO {
  constructor({ category, products = [], facets = {}, pagination = {} }) {
    super();
    this.category = CategoryResponseDTO.fromEntity(category);
    const sizes = Array.isArray(facets.availableSizes)
      ? facets.availableSizes
      : Array.isArray(facets.sizes)
      ? facets.sizes
      : ['S', 'M', 'L', 'XL', 'XXL'];
    const colours = Array.isArray(facets.availableColours)
      ? facets.availableColours
      : Array.isArray(facets.colourKeys)
      ? facets.colourKeys
      : ['green', 'white', 'black'];

    this.facets = {
      totalPieces: Number(facets.totalPieces ?? products.length),
      availableSizes: sizes,
      sizes,
      availableColours: colours,
      colourKeys: colours,
      priceRange: facets.priceRange || { min: 0, max: 0 },
    };
    this.products = ProductResponseDTO.fromEntities(products);
    this.pagination = pagination;
  }
}

export class SaveCategoryRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    const picked = BaseDTO.pick(body, [
      'id',
      'name',
      'slug',
      'headline',
      'subtitle',
      'description',
      'bannerImage',
      'bannerImageUrl',
      'bannerPublicId',
      'bannerFile',
      'uploadedImages',
      'featured',
      'active',
      'position',
      'metaTitle',
      'metaDescription',
    ]);

    this.name = String(picked.name || '').trim();
    this.slug = picked.slug
      ? String(picked.slug).trim().toLowerCase()
      : this.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
    this.id = picked.id ? String(picked.id).trim() : `cat-${this.slug || Date.now()}`;
    this.headline = String(picked.headline || picked.subtitle || '').trim();
    this.description = String(picked.description || '').trim();
    const rawBanner = picked.bannerImage || picked.bannerImageUrl;
    this.bannerImage = rawBanner
      ? String(rawBanner).trim()
      : '/images/destined-cards-green.webp';
    this.bannerPublicId = picked.bannerPublicId ? String(picked.bannerPublicId).trim() : '';
    const uploadedFirst =
      Array.isArray(picked.uploadedImages) && picked.uploadedImages.length > 0
        ? picked.uploadedImages[0]
        : null;
    this.bannerFile = picked.bannerFile || uploadedFirst || null;
    this.featured = Boolean(picked.featured);
    this.active = picked.active !== undefined ? Boolean(picked.active) : true;
    this.position = Number(picked.position || 1);
    this.metaTitle = String(picked.metaTitle || `${this.name} — ROF RAGE`).trim();
    this.metaDescription = String(picked.metaDescription || this.description).trim();
  }
}
