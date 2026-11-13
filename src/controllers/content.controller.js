import { BaseController } from '../core/BaseController.js';
import { UpdateContentRequestDTO } from '../dtos/content.dto.js';

/**
 * Brand Content Configuration Controller (Class-Based, SOLID - SRP & DIP)
 */
export class ContentController extends BaseController {
  constructor(contentService) {
    super(contentService);
  }

  async getContent(_req, res) {
    const content = await this.service.getContent();
    return this.ok(res, content, 'Brand content retrieved successfully');
  }

  async updateContent(req, res) {
    const dto = UpdateContentRequestDTO.fromEntity(req.body);
    const actor = req.user?.name || 'Owner';
    const updated = await this.service.updateContent(dto, actor);
    return this.ok(res, updated, 'Brand content updated successfully');
  }
}

