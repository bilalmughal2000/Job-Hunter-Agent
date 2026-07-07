import type { Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, JobDTO, Paginated } from '@ajh/shared';
import type { IJobService } from '../services/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getValidatedQuery } from '../middlewares/validate.middleware.js';
import { jobFilterSchema } from './schemas.js';

/** Factory so the service is injected (testable, no module-level singletons). */
export function createJobController(jobService: IJobService): {
  list: RequestHandler;
  getById: RequestHandler;
} {
  const list = asyncHandler(async (req: Request, res: Response) => {
    const filter = getValidatedQuery(req, jobFilterSchema);
    const result = await jobService.list(filter);
    const body: ApiSuccess<Paginated<JobDTO>> = { ok: true, data: result };
    res.status(200).json(body);
  });

  const getById = asyncHandler(async (req: Request, res: Response) => {
    const job = await jobService.getById(req.params.id as string);
    const body: ApiSuccess<JobDTO> = { ok: true, data: job };
    res.status(200).json(body);
  });

  return { list, getById };
}
