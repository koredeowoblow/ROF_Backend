import { BaseDTO } from '../core/BaseDTO.js';

/**
 * Authentication, Customer Registration & Admin Studio Session DTOs (Class-Based, SRP & ISP)
 * Masks passwordHash, failedAttempts, and lockout state from responses.
 */
export class RegisterUserRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.name = String(body.name || '').trim();
    this.email = String(body.email || '').trim().toLowerCase();
    this.password = String(body.password || '');
    this.phone = body.phone ? String(body.phone).trim() : '';
    this.address = body.address ? String(body.address).trim() : '';
    this.city = body.city ? String(body.city).trim() : '';
    this.state = body.state ? String(body.state).trim() : 'Lagos';
  }
}

export class LoginRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.email = body.email ? String(body.email).trim().toLowerCase() : '';
    this.password = String(body.password || '');
    this.twoFactorCode = body.twoFactorCode ? String(body.twoFactorCode).trim() : undefined;
  }
}

export class AdminLoginRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    this.email = body.email ? String(body.email).trim().toLowerCase() : 'owner@rofrage.com';
    this.password = String(body.password || '');
    this.twoFactorCode = body.twoFactorCode ? String(body.twoFactorCode).trim() : undefined;
  }
}

export class UpdateProfileRequestDTO extends BaseDTO {
  constructor(body = {}) {
    super();
    const picked = BaseDTO.pick(body, ['name', 'phone', 'address', 'city', 'state']);
    if (picked.name !== undefined) this.name = String(picked.name).trim();
    if (picked.phone !== undefined) this.phone = String(picked.phone).trim();
    if (picked.address !== undefined) this.address = String(picked.address).trim();
    if (picked.city !== undefined) this.city = String(picked.city).trim();
    if (picked.state !== undefined) this.state = String(picked.state).trim();
  }
}

export class UserResponseDTO extends BaseDTO {
  constructor(user = {}) {
    super();
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.phone = user.phone || '';
    this.address = user.address || '';
    this.city = user.city || '';
    this.state = user.state || 'Lagos';
    this.role = user.role;
    this.createdAt = user.createdAt;
  }
}

export class AuthSessionResponseDTO extends BaseDTO {
  constructor({ token, user }) {
    super();
    this.authenticated = true;
    this.token = token;
    this.user = UserResponseDTO.fromEntity(user);
  }
}
