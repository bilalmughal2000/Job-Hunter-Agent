import { Router } from 'express';
import type { IApplicationService } from '../services/index.js';
import { createApplicationController } from '../controllers/application.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  advanceApplicationSchema,
  applicationsFilterSchema,
  createApplicationSchema,
  jobIdParamSchema,
  updateApplicationSchema,
  updateStatusSchema,
} from '../controllers/schemas.js';

/** All application routes require authentication (real users, not the demo shim). */
export function createApplicationRouter(service: IApplicationService): Router {
  const router = Router();
  const c = createApplicationController(service);

  router.use(requireAuth);

  router.get('/', validate(applicationsFilterSchema, 'query'), c.list);
  router.post('/', validate(createApplicationSchema, 'body'), c.create);
  router.get('/:id', validate(jobIdParamSchema, 'params'), c.get);
  router.patch(
    '/:id',
    validate(jobIdParamSchema, 'params'),
    validate(updateApplicationSchema, 'body'),
    c.update,
  );
  router.post(
    '/:id/advance',
    validate(jobIdParamSchema, 'params'),
    validate(advanceApplicationSchema, 'body'),
    c.advance,
  );
  router.put(
    '/:id/status',
    validate(jobIdParamSchema, 'params'),
    validate(updateStatusSchema, 'body'),
    c.updateStatus,
  );

  return router;
}
