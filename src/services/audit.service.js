import { BaseService } from '../core/BaseService.js';
import { AuditEntryResponseDTO } from '../dtos/admin.dto.js';

/**
 * Audit Trail Service (Class-Based, SOLID - SRP & DIP)
 */
export class AuditService extends BaseService {
  constructor(auditRepository) {
    super(auditRepository, null);
  }

  async log({ action, entity, entityId, user = 'System', details = '' }) {
    const entry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: String(action),
      entity: String(entity),
      entityId: String(entityId),
      user: String(user),
      details: String(details || ''),
      timestamp: new Date().toISOString(),
    };
    const created = await this.repository.create(entry);
    return AuditEntryResponseDTO.fromEntity(created);
  }

  async getAuditLogs(paginationParams = {}) {
    const filter = {};
    if (paginationParams.entity) {
      filter.entity = paginationParams.entity;
    }
    const result = await this.repository.findPaginated(paginationParams, {
      filter,
      searchFields: ['action', 'entity', 'entityId', 'user', 'details'],
      defaultSort: { timestamp: -1 },
    });

    return {
      data: AuditEntryResponseDTO.fromEntities(result.data),
      meta: result.meta,
    };
  }
}
