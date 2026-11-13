import { BaseController } from '../core/BaseController.js';
import { AdminLoginRequestDTO } from '../dtos/auth.dto.js';

/**
 * Admin Dashboard Authentication, Overview, Customers, Audit & Settings Controller (Class-Based, SOLID - SRP & DIP)
 */
export class AdminController extends BaseController {
  constructor(adminService, auditService) {
    super(adminService);
    this.auditService = auditService;
  }

  /**
   * POST /api/v1/admin/login — Dedicated Admin Studio login endpoint
   */
  async login(req, res) {
    const loginDto = AdminLoginRequestDTO.fromEntity(req.body);
    const session = await this.service.login(loginDto);
    return this.ok(res, session, 'Authenticated into Admin Studio successfully');
  }

  /**
   * POST /api/v1/admin/logout — Dedicated Admin Studio logout endpoint
   */
  async logout(req, res) {
    const result = await this.service.logout(req.user || null);
    return this.ok(res, result, 'Logged out of Admin Studio');
  }

  async getOverview(req, res) {
    const range = ['today', '7d', '30d'].includes(req.query.range) ? req.query.range : '7d';
    const overview = await this.service.getOverview(range);
    return this.ok(res, overview, 'Studio overview metrics retrieved');
  }

  async getCustomers(req, res) {
    const paginationParams = this.getPaginationParams(req);
    const result = await this.service.getCustomers(paginationParams);
    return this.paginated(res, result, 'Customer directory retrieved');
  }

  async getAuditLog(req, res) {
    const paginationParams = {
      ...this.getPaginationParams(req),
      entity: req.query.entity,
    };
    const result = await this.auditService.getAuditLogs(paginationParams);
    return this.paginated(res, result, 'Audit log retrieved');
  }

  async getSettings(_req, res) {
    const settings = await this.service.getSettings();
    return this.ok(res, settings, 'Studio settings retrieved');
  }

  async updateSettings(req, res) {
    const actor = req.user?.name || 'Owner';
    const updated = await this.service.updateSettings(req.body, actor);
    return this.ok(res, updated, 'Studio settings updated');
  }
}
