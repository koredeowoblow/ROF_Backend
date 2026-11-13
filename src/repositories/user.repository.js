import { BaseRepository } from '../core/BaseRepository.js';
import { UserModel } from '../models/user.model.js';

/**
 * User / Staff MongoDB Repository (Class-Based, SOLID - SRP & LSP)
 */
export class UserRepository extends BaseRepository {
  constructor(model = UserModel) {
    super(model, 'id');
  }

  async findByEmail(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    return await this.findOne({ email: cleanEmail });
  }
}
