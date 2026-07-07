import { Router } from 'express';
import type { IJobService } from '../services/index.js';
import { createJobController } from '../controllers/job.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { jobFilterSchema, jobIdParamSchema } from '../controllers/schemas.js';

export function createJobRouter(jobService: IJobService): Router {
  const router = Router();
  const controller = createJobController(jobService);

  router.get('/', validate(jobFilterSchema, 'query'), controller.list);
  router.get('/:id', validate(jobIdParamSchema, 'params'), controller.getById);

  return router;
}
