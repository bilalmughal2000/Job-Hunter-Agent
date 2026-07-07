import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';

export interface AuthedUser {
  id: string;
  email: string;
  role: string;
}

/** Augment Express Request with the resolved user (set by the middlewares below). */
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthedUser;
  }
}

function readBearer(req: Request): string | null {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/** Populates req.user if a valid token is present; ignores invalid tokens. */
export const attachUser: RequestHandler = (req, _res, next) => {
  const token = readBearer(req);
  if (token) {
    try {
      const payload = verifyToken(token);
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      // Anonymous request — leave req.user undefined.
    }
  }
  next();
};

/** Requires a valid token; 401 otherwise. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readBearer(req);
  if (!token) throw new UnauthorizedError('Authentication required');
  const payload = verifyToken(token);
  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
};

/** Requires an authenticated admin; 403 for non-admins. */
export const requireAdmin: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') throw new UnauthorizedError('Admin access required');
  next();
};
