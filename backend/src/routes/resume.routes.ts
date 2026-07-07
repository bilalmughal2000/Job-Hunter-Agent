import { Router } from 'express';
import type { IResumeService } from '../services/index.js';
import { createResumeController } from '../controllers/resume.controller.js';
import { resumeUpload } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { resumeIdParamSchema } from '../controllers/schemas.js';

export function createResumeRouter(
  resumeService: IResumeService,
  resolveDemoUserId: () => Promise<string>,
): Router {
  const router = Router();
  const controller = createResumeController(resumeService, resolveDemoUserId);

  router.post('/upload', resumeUpload(), controller.upload);
  router.get('/:id', validate(resumeIdParamSchema, 'params'), controller.getById);
  router.get('/:id/profile', validate(resumeIdParamSchema, 'params'), controller.getProfile);

  return router;
}
