import { BaseRepository } from '../core/BaseRepository.js';
import { AuditModel } from '../models/audit.model.js';

/**
 * Audit Trail MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class AuditRepository extends BaseRepository {
  constructor(model = AuditModel) {
    super(model, 'id');
  }
}

