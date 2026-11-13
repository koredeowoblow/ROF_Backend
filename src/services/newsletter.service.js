import { BaseService } from '../core/BaseService.js';

/**
 * Newsletter Subscription Service (Class-Based, SOLID - SRP & DIP)
 */
export class NewsletterService extends BaseService {
  constructor(newsletterRepository, auditService) {
    super(newsletterRepository, auditService);
  }

  async subscribe(newsletterDto) {
    const existing = await this.repository.findByEmail(newsletterDto.email);
    if (!existing) {
      await this.repository.create({
        id: `sub-${Date.now()}`,
        email: newsletterDto.email,
        subscribedAt: new Date().toISOString(),
        active: true,
      });
    }

    return {
      success: true,
      email: newsletterDto.email,
      message: 'Welcome to the ROF list. Destined for riches.',
    };
  }
}
