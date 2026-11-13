import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { CategoryResponseDTO, CategoryPageResponseDTO } from '../dtos/category.dto.js';
import { CloudinaryService } from './cloudinary.service.js';

/**
 * Category & Category Page Service (Class-Based, SOLID - SRP & DIP)
 *
 * Powers:
 * - Storefront Category Page (`/api/v1/categories/:slug`) with hero banner, facet filters
 *   (availableSizes, availableColours, priceRange), and paginated products.
 * - Category listing with live product counts.
 * - Admin Category management with Cloudinary banner image upload.
 */
export class CategoryService extends BaseService {
  constructor(
    categoryRepository,
    productRepository,
    auditService,
    cloudinaryService = new CloudinaryService()
  ) {
    super(categoryRepository, auditService);
    this.productRepository = productRepository;
    this.cloudinaryService = cloudinaryService;
  }

  /**
   * List all categories enriched with live product counts
   */
  async getCategories({ isAdmin = false } = {}) {
    const categories = await this.repository.findAllCategories({ onlyActive: !isAdmin });
    const allProducts = await this.productRepository.findAll(
      isAdmin ? {} : { published: true }
    );

    const enriched = categories.map((cat) => {
      const count = allProducts.filter(
        (p) => p.categorySlug === cat.slug || p.categoryId === cat.id
      ).length;
      return CategoryResponseDTO.fromEntity({
        ...cat,
        productCount: count,
      });
    });

    return enriched;
  }

  /**
   * Retrieve full Category Page payload by category slug or ID:
   * - Category metadata & Cloudinary banner
   * - Facets (availableSizes, availableColours, priceRange, totalPieces)
   * - Paginated, filterable products in this category
   */
  async getCategoryPage(slugOrId, queryParams = {}, { isAdmin = false } = {}) {
    const normalizedSlug = String(slugOrId || '').trim().toLowerCase();

    let category = await this.repository.findBySlugOrId(slugOrId, {
      onlyActive: !isAdmin,
    });

    // Support special virtual collection slugs ("all", "featured", "new-arrivals", "best-sellers")
    let isVirtualCollection = false;
    const extraQuery = { ...queryParams };

    if (!category) {
      if (normalizedSlug === 'all' || normalizedSlug === 'catalog') {
        isVirtualCollection = true;
        category = {
          id: 'cat-all',
          name: 'All Collections',
          slug: 'all',
          headline: 'Complete Studio Archive',
          description: 'Every heavyweight edition released by the ROF RAGE Lagos studio.',
          bannerImage: '/images/rof-hero-1.webp',
          featured: true,
          active: true,
          position: 0,
        };
      } else if (normalizedSlug === 'featured') {
        isVirtualCollection = true;
        extraQuery.featured = 'true';
        category = {
          id: 'cat-featured',
          name: 'Featured Editions',
          slug: 'featured',
          headline: 'Signature Studio Selects',
          description: 'Curated heavyweight pieces highlighted from the current drop.',
          bannerImage: '/images/rof-hero-1.webp',
          featured: true,
          active: true,
          position: 0,
        };
      } else if (normalizedSlug === 'new-arrivals') {
        isVirtualCollection = true;
        extraQuery.isNewArrival = 'true';
        category = {
          id: 'cat-new-arrivals',
          name: 'New Arrivals',
          slug: 'new-arrivals',
          headline: 'Fresh From The Press',
          description: 'Latest heavyweight releases straight out of Lagos.',
          bannerImage: '/images/rof-hero-2.webp',
          featured: true,
          active: true,
          position: 0,
        };
      } else {
        throw AppError.notFound('Category', slugOrId);
      }
    }

    const categoryFilter = isVirtualCollection ? null : category.slug;
    const filter = this.productRepository.buildCatalogFilter(extraQuery, {
      isAdmin,
      categoryFilter,
    });

    const paginatedProducts = await this.productRepository.findPaginated(
      {
        ...extraQuery,
        sortBy: extraQuery.sortBy || 'position',
        sortOrder: extraQuery.sortOrder || 'asc',
      },
      {
        filter,
        searchFields: ['name', 'slug', 'colour', 'print', 'blurb', 'tags'],
        defaultSort: { position: 1 },
      }
    );

    const facets = await this.productRepository.getCategoryFacets(
      isVirtualCollection ? null : category.slug,
      { onlyPublished: !isAdmin }
    );

    return new CategoryPageResponseDTO({
      category: {
        ...category,
        productCount: facets.totalPieces,
      },
      products: paginatedProducts.data,
      facets,
      pagination: paginatedProducts.meta,
    });
  }

  /**
   * Create or update a category (Admin/Owner) with optional Cloudinary banner upload
   */
  async saveCategory(saveCategoryDto, actorName = 'Owner', uploadedFiles = []) {
    const existing = await this.repository.findById(saveCategoryDto.id);

    let bannerImage = saveCategoryDto.bannerImage;
    let bannerPublicId = saveCategoryDto.bannerPublicId || existing?.bannerPublicId || '';

    const uploadCandidate =
      uploadedFiles?.[0] ||
      saveCategoryDto.bannerFile ||
      (typeof bannerImage === 'string' && bannerImage.startsWith('data:image/')
        ? bannerImage
        : null);

    if (uploadCandidate) {
      const uploaded = await this.cloudinaryService.uploadImage(uploadCandidate, {
        folder: 'rof_rage/categories',
        publicIdPrefix: saveCategoryDto.slug,
      });
      bannerImage = uploaded.url;
      bannerPublicId = uploaded.publicId;
    }

    const toSave = {
      ...saveCategoryDto,
      bannerImage,
      bannerPublicId,
    };
    delete toSave.bannerFile;

    const saved = await this.repository.save(toSave);

    await this.recordAudit({
      action: existing ? 'Category Updated' : 'Category Created',
      entity: 'Category',
      entityId: saved.id,
      user: actorName,
      details: `${existing ? 'Updated' : 'Created'} category "${saved.name}" (/categories/${saved.slug})`,
    });

    return CategoryResponseDTO.fromEntity(saved);
  }

  /**
   * Delete a category by ID (Owner only)
   */
  async deleteCategory(categoryId, actorName = 'Owner') {
    const existing = await this.repository.findBySlugOrId(categoryId);
    if (!existing) {
      throw AppError.notFound('Category', categoryId);
    }

    if (existing.bannerPublicId) {
      await this.cloudinaryService.deleteImage(existing.bannerPublicId);
    }

    await this.repository.deleteById(existing.id);

    await this.recordAudit({
      action: 'Category Deleted',
      entity: 'Category',
      entityId: existing.id,
      user: actorName,
      details: `Deleted category "${existing.name}"`,
    });

    return true;
  }
}

