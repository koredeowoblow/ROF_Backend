import { BaseController } from '../core/BaseController.js';
import { NewsletterSubscribeRequestDTO } from '../dtos/message.dto.js';

/**
 * Newsletter Controller (Class-Based, SOLID - SRP & DIP)
 */
export class NewsletterController extends BaseController {
  constructor(newsletterService) {
    super(newsletterService);
  }

  async subscribe(req, res) {
    const dto = NewsletterSubscribeRequestDTO.fromEntity(req.body);
    const result = await this.service.subscribe(dto);
    return this.ok(res, result, result.message);
  }
}

