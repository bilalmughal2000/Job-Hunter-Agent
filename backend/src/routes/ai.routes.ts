import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type {
  IApplicationDocsService,
  IJobAnalysisService,
  IMatchingService,
} from '../services/index.js';
import { createJobAiController } from '../controllers/ai.controller.js';
import { createApplicationDocsController } from '../controllers/applicationDocs.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  coverLetterBodySchema,
  coverLetterUpdateSchema,
  customizeBodySchema,
  jobIdInParamSchema,
  jobIdParamSchema,
  matchBodySchema,
  resumeIdParamSchema,
} from '../controllers/schemas.js';

// AI calls can be slow/expensive; throttle harder than the global limiter.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/** Job-scoped AI routes, mounted under /jobs alongside the CRUD router. */
export function createJobAiRouter(
  analysisService: IJobAnalysisService,
  matchingService: IMatchingService,
  resolveDemoUserId: () => Promise<string>,
): Router {
  const router = Router();
  const c = createJobAiController(analysisService, matchingService, resolveDemoUserId);
  router.post('/:id/analyze', aiLimiter, validate(jobIdParamSchema, 'params'), c.analyze);
  router.post(
    '/:id/match',
    aiLimiter,
    validate(jobIdParamSchema, 'params'),
    validate(matchBodySchema, 'body'),
    c.match,
  );
  return router;
}

/** Customized-resume routes, mounted under /resume. */
export function createResumeDocsRouter(
  docs: IApplicationDocsService,
  resolveDemoUserId: () => Promise<string>,
): Router {
  const router = Router();
  const c = createApplicationDocsController(docs, resolveDemoUserId);
  router.post('/customize', aiLimiter, validate(customizeBodySchema, 'body'), c.customize);
  router.get('/versions/:jobId', validate(jobIdInParamSchema, 'params'), c.listVersions);
  return router;
}

/** Cover-letter routes, mounted under /cover-letter. */
export function createCoverLetterRouter(
  docs: IApplicationDocsService,
  resolveDemoUserId: () => Promise<string>,
): Router {
  const router = Router();
  const c = createApplicationDocsController(docs, resolveDemoUserId);
  router.post('/', aiLimiter, validate(coverLetterBodySchema, 'body'), c.createCoverLetter);
  router.put(
    '/:id',
    validate(resumeIdParamSchema, 'params'),
    validate(coverLetterUpdateSchema, 'body'),
    c.editCoverLetter,
  );
  return router;
}
