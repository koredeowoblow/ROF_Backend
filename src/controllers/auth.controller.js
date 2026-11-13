import { BaseController } from '../core/BaseController.js';
import {
  RegisterUserRequestDTO,
  LoginRequestDTO,
  AdminLoginRequestDTO,
  UpdateProfileRequestDTO,
} from '../dtos/auth.dto.js';

/**
 * Customer & Admin Authentication Controller (Class-Based, SOLID - SRP & DIP)
 */
export class AuthController extends BaseController {
  constructor(authService) {
    super(authService);
  }

  /**
   * Register a new customer account (can be called before checkout/payment to track orders)
   */
  async register(req, res) {
    const dto = RegisterUserRequestDTO.fromEntity(req.body);
    const session = await this.service.register(dto);
    return this.created(res, session, 'Customer account registered successfully');
  }

  /**
   * Customer or Staff/Owner login
   */
  async login(req, res) {
    const loginDto = LoginRequestDTO.fromEntity(req.body);
    const session = await this.service.login(loginDto);
    return this.ok(res, session, 'Authenticated successfully');
  }

  /**
   * Dedicated Admin Studio login (strictly requires Owner or Staff role)
   */
  async adminLogin(req, res) {
    const adminDto = AdminLoginRequestDTO.fromEntity(req.body);
    const session = await this.service.adminLogin(adminDto);
    return this.ok(res, session, 'Authenticated into Admin Studio successfully');
  }

  async logout(_req, res) {
    return this.ok(res, { authenticated: false }, 'Logged out successfully');
  }

  async getMe(req, res) {
    const profile = await this.service.getProfile(req.user.id, req.user);
    return this.ok(res, profile, 'User profile retrieved');
  }

  async updateMe(req, res) {
    const dto = UpdateProfileRequestDTO.fromEntity(req.body);
    const updated = await this.service.updateProfile(req.user.id, dto, req.user);
    return this.ok(res, updated, 'Profile updated successfully');
  }

  async getUserById(req, res) {
    const profile = await this.service.getProfile(req.params.id, req.user);
    return this.ok(res, profile, 'User profile retrieved');
  }
}
