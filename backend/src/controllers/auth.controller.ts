import type { Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, AuthResultDTO, AuthUserDTO } from '@ajh/shared';
import type { IAuthService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UnauthorizedError } from '../utils/errors.js';

export function createAuthController(auth: IAuthService): {
  register: RequestHandler;
  login: RequestHandler;
  me: RequestHandler;
} {
  const register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body as {
      email: string;
      password: string;
      name?: string;
    };
    const data = await auth.register(email, password, name);
    const body: ApiSuccess<AuthResultDTO> = { ok: true, data };
    res.status(201).json(body);
  });

  const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    const data = await auth.login(email, password);
    const body: ApiSuccess<AuthResultDTO> = { ok: true, data };
    res.status(200).json(body);
  });

  const me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const data: AuthUserDTO = await auth.me(req.user.id);
    const body: ApiSuccess<AuthUserDTO> = { ok: true, data };
    res.status(200).json(body);
  });

  return { register, login, me };
}
