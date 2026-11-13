import { BaseRepository } from '../core/BaseRepository.js';
import { IdempotencyModel } from '../models/idempotency.model.js';

/**
 * Idempotency Key MongoDB Repository (Class-Based, SOLID - SRP)
 * Prevents duplicate order charges on client retries.
 */
export class IdempotencyRepository extends BaseRepository {
  constructor(model = IdempotencyModel) {
    super(model, 'key');
  }

  async findByKey(key) {
    if (!key) return null;
    return await this.findById(String(key).trim());
  }
}
