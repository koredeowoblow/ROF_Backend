import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { MessageResponseDTO } from '../dtos/message.dto.js';

/**
 * Contact Inquiry & Customer Support Message Service (Class-Based, SOLID - SRP & DIP)
 */
export class MessageService extends BaseService {
  constructor(messageRepository, auditService) {
    super(messageRepository, auditService);
  }

  /**
   * Submit a new customer inquiry message (links userId if customer is logged in)
   */
  async createMessage(createMessageDto) {
    const entity = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: createMessageDto.userId || null,
      orderId: createMessageDto.orderId || null,
      name: createMessageDto.name,
      email: createMessageDto.email,
      phone: createMessageDto.phone,
      subject: createMessageDto.subject || 'General Inquiry',
      message: createMessageDto.message,
      createdAt: new Date().toISOString(),
      handled: false,
      replies: [],
    };
    const created = await this.repository.create(entity);
    return MessageResponseDTO.fromEntity(created);
  }

  /**
   * Retrieve paginated messages belonging to the logged-in customer (IDOR-safe)
   */
  async getMyMessages(authenticatedUser, paginationParams = {}) {
    if (!authenticatedUser) {
      throw AppError.unauthorized('Authentication required to view your messages');
    }

    const result = await this.repository.findPaginatedByUser(
      authenticatedUser.id,
      authenticatedUser.email,
      paginationParams
    );

    return {
      data: MessageResponseDTO.fromEntities(result.data),
      meta: result.meta,
    };
  }

  /**
   * Retrieve a single message by ID with IDOR ownership enforcement
   */
  async getMessageById(messageId, requester) {
    const msg = await this.repository.findById(messageId);
    if (!msg) {
      throw AppError.notFound('Message', messageId);
    }

    const isAdminOrStaff = requester && (requester.role === 'Owner' || requester.role === 'Staff');
    const isMessageOwner =
      requester &&
      ((msg.userId && String(msg.userId) === String(requester.id)) ||
        msg.email.toLowerCase() === requester.email.toLowerCase());

    if (!isAdminOrStaff && !isMessageOwner) {
      throw AppError.idor('IDOR Protection: You are not authorized to view this message');
    }

    return MessageResponseDTO.fromEntity(msg);
  }

  /**
   * Admin/Staff paginated list of all customer messages
   */
  async getMessages(paginationParams = {}) {
    const filter = {};
    if (paginationParams.handled !== undefined) {
      filter.handled = String(paginationParams.handled) === 'true';
    }

    const result = await this.repository.findPaginated(paginationParams, {
      filter,
      searchFields: ['name', 'email', 'phone', 'subject', 'message', 'orderId'],
      defaultSort: { createdAt: -1 },
    });

    return {
      data: MessageResponseDTO.fromEntities(result.data),
      meta: result.meta,
    };
  }

  /**
   * Admin/Staff reply to a customer message (records reply in MongoDB and marks handled)
   */
  async replyToMessage(messageId, replyDto) {
    const existing = await this.repository.findById(messageId);
    if (!existing) {
      throw AppError.notFound('Message', messageId);
    }

    const replyEntry = {
      id: `reply-${Date.now()}`,
      senderName: replyDto.senderName,
      senderRole: replyDto.senderRole,
      replyText: replyDto.replyText,
      createdAt: new Date().toISOString(),
    };

    const updated = await this.repository.addReply(messageId, replyEntry);

    await this.recordAudit({
      action: 'Inquiry Replied',
      entity: 'Message',
      entityId: messageId,
      user: `${replyDto.senderName} (${replyDto.senderRole})`,
      details: `Replied to inquiry from ${existing.email}`,
    });

    return MessageResponseDTO.fromEntity(updated);
  }

  /**
   * Toggle handled status of a customer inquiry
   */
  async toggleHandled(messageId, actorName = 'Owner') {
    const updated = await this.repository.toggleHandled(messageId);
    if (!updated) {
      throw AppError.notFound('Message', messageId);
    }

    await this.recordAudit({
      action: 'Inquiry Status Updated',
      entity: 'Message',
      entityId: messageId,
      user: actorName,
      details: `Marked inquiry from ${updated.email} as ${updated.handled ? 'handled' : 'unhandled'}`,
    });

    return MessageResponseDTO.fromEntity(updated);
  }

  /**
   * Delete a message by ID (Owner/Staff)
   */
  async deleteMessage(messageId, actorName = 'Owner') {
    const existing = await this.repository.findById(messageId);
    if (!existing) {
      throw AppError.notFound('Message', messageId);
    }

    await this.repository.deleteById(messageId);

    await this.recordAudit({
      action: 'Inquiry Deleted',
      entity: 'Message',
      entityId: messageId,
      user: actorName,
      details: `Deleted inquiry from ${existing.email}`,
    });

    return true;
  }
}
