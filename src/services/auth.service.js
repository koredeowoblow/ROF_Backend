import { BaseService } from '../core/BaseService.js';
import { AppError } from '../core/AppError.js';
import { cryptoService } from '../utils/crypto.js';
import { config } from '../config/index.js';
import { AuthSessionResponseDTO, UserResponseDTO } from '../dtos/auth.dto.js';

/**
 * Customer & Admin Authentication Service (Class-Based, SOLID - SRP & DIP)
 * Supports:
 * - Customer registration & login before payment (links customer orders to userId for tracking)
 * - Admin Studio login (Owner & Staff RBAC with 5-attempt brute-force lockout protection)
 * - IDOR-protected profile inspection and updates
 */
export class AuthService extends BaseService {
  constructor(userRepository, auditService, orderRepository = null) {
    super(userRepository, auditService);
    this.orderRepository = orderRepository;
  }

  /**
   * Register a new Customer account (can be called before checkout/payment)
   * Automatically attaches any existing orders placed with the same email to the new userId.
   */
  async register(registerDto) {
    const existing = await this.repository.findByEmail(registerDto.email);
    if (existing) {
      throw AppError.conflict(`An account with email '${registerDto.email}' already exists`);
    }

    const userEntity = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: registerDto.name,
      email: registerDto.email,
      phone: registerDto.phone || '',
      address: registerDto.address || '',
      city: registerDto.city || '',
      state: registerDto.state || 'Lagos',
      role: 'Customer',
      passwordHash: cryptoService.hashPassword(registerDto.password),
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString(),
    };

    const createdUser = await this.repository.create(userEntity);

    // Link any previous guest orders matching this email so customer can track all orders
    if (this.orderRepository) {
      await this.orderRepository.attachUserToGuestOrders(createdUser.id, createdUser.email);
    }

    const token = this.#issueToken(createdUser);
    return AuthSessionResponseDTO.fromEntity({ token, user: createdUser });
  }

  /**
   * Authenticate a User (Customer, Staff, or Owner)
   * Links any unlinked orders matching their email to their userId for seamless order tracking.
   */
  async login(loginDto) {
    const email = loginDto.email || 'owner@rofrage.com';
    const user = await this.#verifyUserCredentials(email, loginDto.password);

    if (this.orderRepository) {
      await this.orderRepository.attachUserToGuestOrders(user.id, user.email);
    }

    const token = this.#issueToken(user);

    if (user.role === 'Owner' || user.role === 'Staff') {
      await this.recordAudit({
        action: 'Admin Login',
        entity: 'User',
        entityId: user.id,
        user: `${user.name} (${user.role})`,
        details: `Authenticated session started for ${user.email}`,
      });
    }

    return AuthSessionResponseDTO.fromEntity({ token, user });
  }

  /**
   * Dedicated Admin Studio Login (Strictly requires 'Owner' or 'Staff' role)
   */
  async adminLogin(adminLoginDto) {
    const email = adminLoginDto.email || 'owner@rofrage.com';
    const user = await this.#verifyUserCredentials(email, adminLoginDto.password);

    if (user.role !== 'Owner' && user.role !== 'Staff') {
      throw AppError.forbidden(
        'Access denied: Customer accounts cannot sign in to the Admin Studio terminal'
      );
    }

    const token = this.#issueToken(user);

    await this.recordAudit({
      action: 'Admin Studio Login',
      entity: 'User',
      entityId: user.id,
      user: `${user.name} (${user.role})`,
      details: `Admin Studio terminal session started for ${user.email}`,
    });

    return AuthSessionResponseDTO.fromEntity({ token, user });
  }

  async getProfile(userId, requester) {
    if (requester.role !== 'Owner' && String(requester.id) !== String(userId)) {
      throw AppError.idor('IDOR Protection: You are not authorized to view another user profile');
    }

    const user = await this.repository.findById(userId);
    if (!user) {
      throw AppError.notFound('User', userId);
    }

    return UserResponseDTO.fromEntity(user);
  }

  async updateProfile(userId, updateProfileDto, requester) {
    if (requester.role !== 'Owner' && String(requester.id) !== String(userId)) {
      throw AppError.idor('IDOR Protection: You are not authorized to modify another user profile');
    }

    const existing = await this.repository.findById(userId);
    if (!existing) {
      throw AppError.notFound('User', userId);
    }

    const updated = await this.repository.updateById(userId, updateProfileDto);
    return UserResponseDTO.fromEntity(updated);
  }

  async #verifyUserCredentials(email, password) {
    const user = await this.repository.findByEmail(email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      const remainingMinutes = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      throw AppError.tooManyRequests(
        `Account locked due to multiple failed attempts. Try again in ${remainingMinutes} minute(s).`
      );
    }

    const passwordValid = cryptoService.verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      const nextFailures = (user.failedAttempts || 0) + 1;
      const shouldLock = nextFailures >= config.security.maxLoginAttempts;
      const lockedUntil = shouldLock ? Date.now() + config.security.lockoutDurationMs : null;

      await this.repository.updateById(user.id, {
        failedAttempts: nextFailures,
        lockedUntil,
      });

      await this.recordAudit({
        action: 'Failed Login Attempt',
        entity: 'User',
        entityId: user.id,
        user: email,
        details: shouldLock
          ? 'Account locked for 15 minutes after 5 failed attempts'
          : `Invalid password attempt (${nextFailures}/${config.security.maxLoginAttempts})`,
      });

      if (shouldLock) {
        throw AppError.tooManyRequests(
          'Account locked for 15 minutes following multiple unsuccessful attempts.'
        );
      }

      const remaining = config.security.maxLoginAttempts - nextFailures;
      throw AppError.unauthorized(
        `Invalid credentials. ${remaining} attempts remaining before temporary lockout.`
      );
    }

    if (user.failedAttempts > 0 || user.lockedUntil) {
      await this.repository.updateById(user.id, {
        failedAttempts: 0,
        lockedUntil: null,
      });
    }

    return user;
  }

  #issueToken(user) {
    return cryptoService.signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      role: user.role,
    });
  }
}
