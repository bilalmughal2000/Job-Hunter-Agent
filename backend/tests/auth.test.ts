import { describe, expect, it, vi } from 'vitest';
import type { User } from '@prisma/client';
import { hashPassword, verifyPassword } from '../src/utils/password.js';
import { AuthService } from '../src/services/auth.service.js';
import type { CreateUserInput, IUserRepository } from '../src/repositories/user.repository.js';
import { UnauthorizedError, ValidationError } from '../src/utils/errors.js';

// jwt signing needs a secret.

describe('password hashing (scrypt)', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('s3cret-passw0rd');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('s3cret-passw0rd', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces a different salt each time', async () => {
    expect(await hashPassword('x')).not.toBe(await hashPassword('x'));
  });

  it('rejects a malformed stored hash', async () => {
    expect(await verifyPassword('x', 'garbage')).toBe(false);
  });
});

function makeRepo(user: User | null) {
  const created: unknown[] = [];
  const repo: IUserRepository = {
    findByEmail: vi.fn().mockResolvedValue(user),
    findById: vi.fn().mockResolvedValue(user),
    create: vi.fn((input: CreateUserInput) => {
      created.push(input);
      const created_user: User = {
        id: 'u1',
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name ?? null,
        role: input.role ?? 'USER',
        isActive: true,
        createdAt: new Date('2026-07-01T00:00:00Z'),
        updatedAt: new Date('2026-07-01T00:00:00Z'),
      };
      return Promise.resolve(created_user);
    }),
  };
  return { repo, created };
}

describe('AuthService', () => {
  it('registers a new user and returns a token', async () => {
    const { repo } = makeRepo(null);
    const svc = new AuthService(repo);
    const result = await svc.register('new@example.com', 'password123', 'New User');
    expect(result.token).toBeTruthy();
    expect(result.user.id).toBe('u1');
    expect(result.user.name).toBe('New User');
  });

  it('rejects duplicate registration', async () => {
    const { repo } = makeRepo({ id: 'u1', email: 'a@b.com' } as User);
    const svc = new AuthService(repo);
    await expect(svc.register('a@b.com', 'password123')).rejects.toBeInstanceOf(ValidationError);
  });

  it('logs in with correct credentials', async () => {
    const passwordHash = await hashPassword('password123');
    const { repo } = makeRepo({
      id: 'u1',
      email: 'a@b.com',
      passwordHash,
      role: 'USER',
      name: null,
    } as User);
    const svc = new AuthService(repo);
    const result = await svc.login('a@b.com', 'password123');
    expect(result.user.id).toBe('u1');
  });

  it('rejects a wrong password', async () => {
    const passwordHash = await hashPassword('password123');
    const { repo } = makeRepo({
      id: 'u1',
      email: 'a@b.com',
      passwordHash,
      role: 'USER',
      name: null,
    } as User);
    const svc = new AuthService(repo);
    await expect(svc.login('a@b.com', 'nope')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects login for an unknown user (no timing leak path)', async () => {
    const { repo } = makeRepo(null);
    const svc = new AuthService(repo);
    await expect(svc.login('ghost@b.com', 'whatever')).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
