import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { IAuthService } from '../services/auth.service.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, registerSchema } from '../controllers/schemas.js';

export function createAuthRouter(auth: IAuthService): Router {
  const router = Router();
  const c = createAuthController(auth);

  // Throttle credential endpoints against brute force.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  router.post('/register', authLimiter, validate(registerSchema, 'body'), c.register);
  router.post('/login', authLimiter, validate(loginSchema, 'body'), c.login);
  router.get('/me', requireAuth, c.me);

  return router;
}
