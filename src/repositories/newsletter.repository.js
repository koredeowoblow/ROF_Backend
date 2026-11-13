import { BaseRepository } from '../core/BaseRepository.js';
import { NewsletterModel } from '../models/newsletter.model.js';

/**
 * Newsletter Subscriber MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class NewsletterRepository extends BaseRepository {
  constructor(model = NewsletterModel) {
    super(model, 'id');
  }

  async findByEmail(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    return await this.findOne({ email: cleanEmail });
  }
}
