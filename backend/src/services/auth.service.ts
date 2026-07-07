import type { AuthResultDTO, AuthUserDTO } from '@ajh/shared';
import type { User } from '@prisma/client';
import type { IUserRepository } from '../repositories/user.repository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

const toAuthUser = (u: User): AuthUserDTO => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
});

export interface IAuthService {
  register(email: string, password: string, name?: string): Promise<AuthResultDTO>;
  login(email: string, password: string): Promise<AuthResultDTO>;
  me(userId: string): Promise<AuthUserDTO>;
}

export class AuthService implements IAuthService {
  constructor(private readonly users: IUserRepository) {}

  private issue(user: User): AuthResultDTO {
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return { token, user: toAuthUser(user) };
  }

  async register(email: string, password: string, name?: string): Promise<AuthResultDTO> {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ValidationError('An account with this email already exists');
    const passwordHash = await hashPassword(password);
    const user = await this.users.create({ email, passwordHash, name });
    return this.issue(user);
  }

  async login(email: string, password: string): Promise<AuthResultDTO> {
    const user = await this.users.findByEmail(email);
    // Verify even when the user is missing to avoid leaking existence via timing.
    const ok = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(password, 'scrypt$00$00');
    if (!user || !ok) throw new UnauthorizedError('Invalid email or password');
    return this.issue(user);
  }

  async me(userId: string): Promise<AuthUserDTO> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedError('User no longer exists');
    return toAuthUser(user);
  }
}
