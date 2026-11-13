import { BaseController } from '../core/BaseController.js';
import { SaveCategoryRequestDTO } from '../dtos/category.dto.js';

/**
 * Category & Category Page Controller (Class-Based, SOLID - SRP & DIP)
 */
export class CategoryController extends BaseController {
  constructor(categoryService) {
    super(categoryService);
  }

  async getCategories(req, res) {
    const isAdmin = Boolean(req.user && (req.user.role === 'Owner' || req.user.role === 'Staff'));
    const categories = await this.service.getCategories({ isAdmin });
    return this.ok(res, categories, 'Categories retrieved successfully');
  }

  async getCategoryPage(req, res) {
    const isAdmin = Boolean(req.user && (req.user.role === 'Owner' || req.user.role === 'Staff'));
    const queryParams = {
      ...this.getPaginationParams(req),
      colourKey: req.query.colourKey,
      size: req.query.size,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      inStock: req.query.inStock,
      featured: req.query.featured,
      tag: req.query.tag,
    };

    const pageData = await this.service.getCategoryPage(req.params.slug, queryParams, { isAdmin });
    return this.ok(res, pageData, 'Category page retrieved successfully');
  }

  async saveCategory(req, res) {
    const dto = SaveCategoryRequestDTO.fromEntity({
      ...req.body,
      ...(req.params.id ? { id: req.params.id } : {}),
    });
    const actor = req.user?.name || 'Owner';
    const saved = await this.service.saveCategory(dto, actor, req.uploadedFiles || []);
    return this.ok(res, saved, 'Category saved successfully');
  }

  async deleteCategory(req, res) {
    const actor = req.user?.name || 'Owner';
    await this.service.deleteCategory(req.params.id, actor);
    return this.noContent(res);
  }
}

