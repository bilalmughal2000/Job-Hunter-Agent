import jwt from 'jsonwebtoken';
import { env } from '../config/index.js';
import { UnauthorizedError } from './errors.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

function secret(): string {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured — set it to enable authentication');
  }
  return env.JWT_SECRET;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, secret());
    if (typeof decoded === 'string') throw new UnauthorizedError('Invalid token');
    return decoded as JwtPayload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired token');
  }
}
