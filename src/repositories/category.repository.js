import { BaseRepository } from '../core/BaseRepository.js';
import { CategoryModel } from '../models/category.model.js';

/**
 * Category MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class CategoryRepository extends BaseRepository {
  constructor(model = CategoryModel) {
    super(model, 'id');
  }

  /**
   * Find a category by slug or ID, optionally scoped to active=true
   */
  async findBySlugOrId(slugOrId, { onlyActive = false } = {}) {
    const clean = String(slugOrId || '').trim();
    const lower = clean.toLowerCase();
    return await this.findOne({
      $or: [{ slug: lower }, { id: clean }],
      ...(onlyActive ? { active: true } : {}),
    });
  }

  /**
   * List all categories ordered by position
   */
  async findAllCategories({ onlyActive = true } = {}) {
    return await this.findAll(onlyActive ? { active: true } : {}, { position: 1, name: 1 });
  }
}

