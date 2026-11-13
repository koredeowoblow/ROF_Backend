import { BaseDTO } from '../core/BaseDTO.js';

/**
 * Contact Inquiry, Replies & Newsletter DTOs (Class-Based, SRP)
 */
export class CreateMessageRequestDTO extends BaseDTO {
  constructor(body = {}, authenticatedUser = null) {
    super();
    this.userId = authenticatedUser?.id || null;
    this.orderId = body.orderId ? String(body.orderId).trim().toUpperCase() : null;
    this.name = String(body.name || authenticatedUser?.name || '').trim();
    this.email = String(body.email || authenticatedUser?.email || '')
      .trim()
      .toLowerCase();
    this.phone = body.phone || authenticatedUser?.phone
      ? String(body.phone || authenticatedUser?.phone).trim()
      : undefined;
    this.subject = body.subject ? String(body.subject).trim() : 'General Inquiry';
    this.message = String(body.message || '').trim();
  }
}

export class ReplyMessageRequestDTO extends BaseDTO {
  constructor(body = {}, actorUser = null) {
    super();
    this.replyText = String(body.replyText || body.message || '').trim();
    this.senderName = actorUser?.name || 'ROF Studio';
    this.senderRole = actorUser?.role || 'Owner';
  }
}

export class MessageResponseDTO extends BaseDTO {
  constructor(msg = {}) {
    super();
    this.id = msg.id;
    this.userId = msg.userId || null;
    if (msg.orderId) this.orderId = msg.orderId;
    this.name = msg.name;
    this.email = msg.email;
    if (msg.phone) this.phone = msg.phone;
    this.subject = msg.subject || 'General Inquiry';
    this.message = msg.message;
    this.createdAt = msg.createdAt;
    this.handled = Boolean(msg.handled);
    this.replies = Array.isArray(msg.replies) ? [...msg.replies] : [];
  }
}

export class NewsletterSubscribeRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.email = String(body.email || '').trim().toLowerCase();
  }
}
