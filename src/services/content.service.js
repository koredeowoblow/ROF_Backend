import { BaseService } from '../core/BaseService.js';
import { ContentResponseDTO } from '../dtos/content.dto.js';

/**
 * Brand Content Configuration Service (Class-Based, SOLID - SRP & DIP)
 */
export class ContentService extends BaseService {
  constructor(contentRepository, auditService) {
    super(contentRepository, auditService);
  }

  async getContent() {
    const content = await this.repository.getContent();
    return ContentResponseDTO.fromEntity(content);
  }

  async updateContent(updateContentDto, actorName = 'Owner') {
    const updated = await this.repository.saveContent(updateContentDto);

    await this.recordAudit({
      action: 'Content Update',
      entity: 'Content',
      entityId: 'brand-content',
      user: actorName,
      details: 'Updated brand content and delivery tariff configuration',
    });

    return ContentResponseDTO.fromEntity(updated);
  }
}
