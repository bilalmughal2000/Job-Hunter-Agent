import type { Request, RequestHandler, Response } from 'express';
import type {
  ApiSuccess,
  ApplicationDTO,
  ApplicationPackageDTO,
  ApplicationStatus,
  Paginated,
} from '@ajh/shared';
import type { IApplicationService, UpdateApplicationInput } from '../services/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getValidatedQuery } from '../middlewares/validate.middleware.js';
import { UnauthorizedError } from '../utils/errors.js';
import { applicationsFilterSchema } from './schemas.js';

/** All handlers require an authenticated user (req.user set by requireAuth). */
export function createApplicationController(service: IApplicationService): {
  create: RequestHandler;
  get: RequestHandler;
  list: RequestHandler;
  advance: RequestHandler;
  updateStatus: RequestHandler;
  update: RequestHandler;
} {
  const userId = (req: Request): string => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    return req.user.id;
  };

  const create = asyncHandler(async (req: Request, res: Response) => {
    const data = await service.create(userId(req), req.body as { jobId: string });
    const body: ApiSuccess<ApplicationDTO> = { ok: true, data };
    res.status(201).json(body);
  });

  const get = asyncHandler(async (req: Request, res: Response) => {
    const data = await service.getPackage(userId(req), req.params.id as string);
    const body: ApiSuccess<ApplicationPackageDTO> = { ok: true, data };
    res.status(200).json(body);
  });

  const list = asyncHandler(async (req: Request, res: Response) => {
    const filter = getValidatedQuery(req, applicationsFilterSchema);
    const data = await service.list(userId(req), filter);
    const body: ApiSuccess<Paginated<ApplicationDTO>> = { ok: true, data };
    res.status(200).json(body);
  });

  const advance = asyncHandler(async (req: Request, res: Response) => {
    const { note } = req.body as { note?: string };
    const data = await service.advance(userId(req), req.params.id as string, note);
    const body: ApiSuccess<ApplicationDTO> = { ok: true, data };
    res.status(200).json(body);
  });

  const updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status, note } = req.body as { status: ApplicationStatus; note?: string };
    const data = await service.updateStatus(userId(req), req.params.id as string, status, note);
    const body: ApiSuccess<ApplicationDTO> = { ok: true, data };
    res.status(200).json(body);
  });

  const update = asyncHandler(async (req: Request, res: Response) => {
    const data = await service.update(
      userId(req),
      req.params.id as string,
      req.body as UpdateApplicationInput,
    );
    const body: ApiSuccess<ApplicationDTO> = { ok: true, data };
    res.status(200).json(body);
  });

  return { create, get, list, advance, updateStatus, update };
}
