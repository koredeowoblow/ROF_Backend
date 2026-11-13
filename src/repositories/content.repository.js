import { BaseRepository } from '../core/BaseRepository.js';
import { ContentModel } from '../models/content.model.js';
import { initialContentConfig } from '../database/initialData.js';

/**
 * Brand Content Configuration MongoDB Repository (Class-Based, SOLID - SRP)
 */
export class ContentRepository extends BaseRepository {
  constructor(model = ContentModel) {
    super(model, 'id');
    this.singletonId = 'brand-content';
  }

  async getContent() {
    let doc = await this.findById(this.singletonId);
    if (!doc) {
      doc = await this.save({ id: this.singletonId, ...initialContentConfig });
    }
    return doc;
  }

  async saveContent(updates) {
    const current = await this.getContent();
    const merged = {
      id: this.singletonId,
      brand: updates.brand ? { ...current.brand, ...updates.brand } : current.brand,
      delivery: updates.delivery ? { ...current.delivery, ...updates.delivery } : current.delivery,
      contact: updates.contact ? { ...current.contact, ...updates.contact } : current.contact,
      help: updates.help ? { ...current.help, ...updates.help } : current.help,
    };
    return await this.save(merged);
  }
}
