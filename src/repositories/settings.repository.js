import { BaseRepository } from '../core/BaseRepository.js';
import { SettingsModel } from '../models/settings.model.js';
import { initialSettings } from '../database/initialData.js';

/**
 * Studio Operational Settings MongoDB Repository (Class-Based, SOLID - SRP)
 */
export class SettingsRepository extends BaseRepository {
  constructor(model = SettingsModel) {
    super(model, 'id');
    this.singletonId = 'global-settings';
  }

  async getSettings() {
    let doc = await this.findById(this.singletonId);
    if (!doc) {
      doc = await this.save({ ...initialSettings, id: this.singletonId });
    }
    return doc;
  }

  async updateSettings(updates = {}) {
    const current = await this.getSettings();
    const updated = {
      ...current,
      ...updates,
      id: this.singletonId,
      updatedAt: new Date().toISOString(),
    };
    return await this.save(updated);
  }
}
