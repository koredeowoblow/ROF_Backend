import { BaseController } from '../core/BaseController.js';
import {
  CreateDiscountRequestDTO,
  ValidateDiscountRequestDTO,
} from '../dtos/discount.dto.js';

/**
 * Discount & Voucher Controller (Class-Based, SOLID - SRP & DIP)
 */
export class DiscountController extends BaseController {
  constructor(discountService) {
    super(discountService);
  }

  async getDiscounts(req, res) {
    const paginationParams = this.getPaginationParams(req);
    const result = await this.service.getDiscounts(paginationParams);
    return this.paginated(res, result, 'Discounts retrieved successfully');
  }

  async createDiscount(req, res) {
    const dto = CreateDiscountRequestDTO.fromEntity(req.body);
    const actor = req.user?.name || 'Owner';
    const created = await this.service.createDiscount(dto, actor);
    return this.created(res, created, 'Discount voucher created successfully');
  }

  async validateDiscountCode(req, res) {
    const dto = ValidateDiscountRequestDTO.fromEntity(req.body);
    const result = await this.service.computeDiscount(dto.code, dto.subtotal, {
      enforceThreshold: true,
    });
    return this.ok(
      res,
      {
        valid: Boolean(result.discountEntity),
        discountAmount: result.discountAmount,
        discount: result.discountEntity,
      },
      'Discount code verified'
    );
  }
}

