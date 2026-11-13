import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { DiscountResponseDTO } from '../dtos/discount.dto.js';

/**
 * Discount & Voucher Service (Class-Based, SOLID - SRP & DIP)
 */
export class DiscountService extends BaseService {
  constructor(discountRepository, auditService) {
    super(discountRepository, auditService);
  }

  async getDiscounts(paginationParams = {}) {
    const result = await this.repository.findPaginated(paginationParams, {
      searchFields: ['code', 'type'],
    });
    return {
      data: DiscountResponseDTO.fromEntities(result.data),
      meta: result.meta,
    };
  }

  async createDiscount(createDiscountDto, actorName = 'Owner') {
    const existing = await this.repository.findOne({ code: createDiscountDto.code });
    if (existing) {
      throw AppError.conflict(`Discount code '${createDiscountDto.code}' already exists`);
    }

    const created = await this.repository.create({
      ...createDiscountDto,
      usedCount: 0,
    });

    await this.recordAudit({
      action: 'Discount Created',
      entity: 'Discount',
      entityId: created.id,
      user: actorName,
      details: `Created discount code ${created.code} (${created.type}: ${created.value})`,
    });

    return DiscountResponseDTO.fromEntity(created);
  }

  /**
   * Calculate and validate discount deduction for a given order subtotal
   */
  async computeDiscount(code, subtotal, { enforceThreshold = false } = {}) {
    if (!code) return { discountAmount: 0, discountEntity: null };

    const discount = await this.repository.findActiveByCode(code);
    if (!discount) {
      if (enforceThreshold) {
        throw AppError.badRequest(`Discount code '${code}' is invalid or inactive`);
      }
      return { discountAmount: 0, discountEntity: null };
    }

    if (discount.expiresAt && new Date(discount.expiresAt).getTime() < Date.now()) {
      if (enforceThreshold) {
        throw AppError.badRequest(`Discount code '${code}' has expired`);
      }
      return { discountAmount: 0, discountEntity: null };
    }

    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      if (enforceThreshold) {
        throw AppError.badRequest(`Discount code '${code}' has reached its redemption limit`);
      }
      return { discountAmount: 0, discountEntity: null };
    }

    if (enforceThreshold && discount.minOrder > 0 && subtotal < discount.minOrder) {
      throw AppError.badRequest(
        `Minimum order of NGN ${discount.minOrder.toLocaleString()} required for code '${code}'`
      );
    }

    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = Math.round((subtotal * discount.value) / 100);
    } else {
      discountAmount = discount.value;
    }

    discountAmount = Math.min(subtotal, Math.max(0, discountAmount));

    return {
      discountAmount,
      discountEntity: DiscountResponseDTO.fromEntity(discount),
    };
  }
}
