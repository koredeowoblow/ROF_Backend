import { BaseController } from '../core/BaseController.js';
import { CreateMessageRequestDTO, ReplyMessageRequestDTO } from '../dtos/message.dto.js';

/**
 * Contact Message & Customer Support Inquiry Controller (Class-Based, SOLID - SRP & DIP)
 */
export class MessageController extends BaseController {
  constructor(messageService) {
    super(messageService);
  }

  /**
   * POST /api/v1/messages — Submit customer inquiry (attaches req.user.id if logged in)
   */
  async sendContactMessage(req, res) {
    const dto = new CreateMessageRequestDTO(req.body, req.user || null).toJSON();
    const created = await this.service.createMessage(dto);
    return this.created(res, created, 'Inquiry submitted successfully');
  }

  /**
   * GET /api/v1/messages/my-messages — Logged-in customer views their own inquiries & replies
   */
  async getMyMessages(req, res) {
    const paginationParams = this.getPaginationParams(req);
    const result = await this.service.getMyMessages(req.user, paginationParams);
    return this.paginated(res, result, 'Your inquiries retrieved successfully');
  }

  /**
   * GET /api/v1/messages/:id — Get single inquiry (IDOR-protected: only message owner or Admin/Staff)
   */
  async getMessageById(req, res) {
    const message = await this.service.getMessageById(req.params.id, req.user);
    return this.ok(res, message, 'Message retrieved successfully');
  }

  /**
   * GET /api/v1/admin/messages — Admin paginated inquiries inbox
   */
  async getAdminMessages(req, res) {
    const paginationParams = {
      ...this.getPaginationParams(req),
      handled: req.query.handled,
    };
    const result = await this.service.getMessages(paginationParams);
    return this.paginated(res, result, 'Messages retrieved successfully');
  }

  /**
   * POST /api/v1/admin/messages/:id/reply — Admin/Staff replies to a customer inquiry
   */
  async replyToMessage(req, res) {
    const dto = new ReplyMessageRequestDTO(req.body, req.user).toJSON();
    const updated = await this.service.replyToMessage(req.params.id, dto);
    return this.ok(res, updated, 'Reply recorded and inquiry marked as handled');
  }

  /**
   * PATCH /api/v1/admin/messages/:id/toggle — Toggle inquiry handled state
   */
  async toggleMessageHandled(req, res) {
    const actor = req.user?.name || 'Owner';
    const updated = await this.service.toggleHandled(req.params.id, actor);
    return this.ok(res, updated, 'Message status updated');
  }

  /**
   * DELETE /api/v1/admin/messages/:id — Delete an inquiry
   */
  async deleteMessage(req, res) {
    const actor = req.user?.name || 'Owner';
    await this.service.deleteMessage(req.params.id, actor);
    return this.noContent(res);
  }
}
