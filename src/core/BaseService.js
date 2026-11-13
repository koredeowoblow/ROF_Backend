import { Logger } from '../utils/logger.js';

/**
 * Abstract Base Service (SOLID - SRP, OCP, DIP & DRY)
 * Provides shared dependency injection and audit trail recording without try/catch boilerplate.
 */
export class BaseService {
  constructor(repository = null, auditService = null) {
    if (new.target === BaseService) {
      throw new Error('BaseService is abstract and cannot be instantiated directly');
    }
    this.repository = repository;
    this.auditService = auditService;
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Record an immutable administrative or security audit entry if AuditService is injected
   */
  async recordAudit({ action, entity, entityId, user = 'System', details = '' }) {
    if (this.auditService && typeof this.auditService.log === 'function') {
      await this.auditService.log({ action, entity, entityId, user, details });
    }
  }
}
