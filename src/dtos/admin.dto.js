import { BaseDTO } from '../core/BaseDTO.js';
import { AdminOrderResponseDTO } from './order.dto.js';
import { MessageResponseDTO } from './message.dto.js';

/**
 * Administrative Studio Analytics, Customers, Audit & Settings DTOs (Class-Based, SRP)
 */
export class AuditEntryResponseDTO extends BaseDTO {
  constructor(entry = {}) {
    super();
    this.id = entry.id;
    this.action = entry.action;
    this.entity = entry.entity;
    this.entityId = entry.entityId;
    this.user = entry.user;
    this.details = entry.details;
    this.timestamp = entry.timestamp;
  }
}

export class CustomerAggregateResponseDTO extends BaseDTO {
  constructor(customer = {}) {
    super();
    this.email = customer.email;
    this.name = customer.name;
    this.phone = customer.phone;
    this.city = customer.city;
    this.state = customer.state;
    this.totalSpent = Number(customer.totalSpent || 0);
    this.orderCount = Number(customer.orderCount || 0);
    this.orders = AdminOrderResponseDTO.fromEntities(customer.orders || []);
  }
}

export class AdminOverviewResponseDTO extends BaseDTO {
  constructor(overview = {}) {
    super();
    this.revenue = Number(overview.revenue || 0);
    this.orderCount = Number(overview.orderCount || 0);
    this.averageOrderValue = Number(overview.averageOrderValue || 0);
    this.piecesSold = Number(overview.piecesSold || 0);
    this.dailyBreakdown = Array.isArray(overview.dailyBreakdown) ? overview.dailyBreakdown : [];
    this.needsAction = {
      newOrders: AdminOrderResponseDTO.fromEntities(overview.needsAction?.newOrders || []),
      unreadMessages: MessageResponseDTO.fromEntities(overview.needsAction?.unreadMessages || []),
      lowStock: Array.isArray(overview.needsAction?.lowStock) ? overview.needsAction.lowStock : [],
    };
    this.recentOrders = AdminOrderResponseDTO.fromEntities(overview.recentOrders || []);
    this.topPieces = Array.isArray(overview.topPieces) ? overview.topPieces : [];
  }
}

export class SettingsResponseDTO extends BaseDTO {
  constructor(settings = {}) {
    super();
    this.paystackSecretKeyMasked = settings.paystackSecretKeyMasked;
    this.paystackWebhookUrl = settings.paystackWebhookUrl;
    this.lowStockThreshold = Number(settings.lowStockThreshold ?? 10);
    this.criticalStockThreshold = Number(settings.criticalStockThreshold ?? 5);
    this.bankAccount = structuredClone(settings.bankAccount || {});
    this.updatedAt = settings.updatedAt;
  }
}

