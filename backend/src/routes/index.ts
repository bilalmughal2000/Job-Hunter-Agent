import { Router } from 'express';
import type { AppContainer } from '../container.js';
import { healthRouter } from './health.routes.js';
import { createJobRouter } from './job.routes.js';
import { createSearchRouter } from './search.routes.js';
import { createResumeRouter } from './resume.routes.js';
import { createCoverLetterRouter, createJobAiRouter, createResumeDocsRouter } from './ai.routes.js';

/**
 * Root API router. Feature routers are wired from the injected container so
 * the whole graph is swappable in tests.
 */
export function createApiRouter(container: AppContainer): Router {
  const apiRouter = Router();

  apiRouter.use('/health', healthRouter);
  apiRouter.use('/jobs', createJobRouter(container.jobService));
  // AI job endpoints (analyze/match) share the /jobs mount.
  apiRouter.use(
    '/jobs',
    createJobAiRouter(
      container.jobAnalysisService,
      container.matchingService,
      container.resolveDemoUserId,
    ),
  );
  apiRouter.use(
    '/search',
    createSearchRouter(container.searchService, container.resolveDemoUserId),
  );
  apiRouter.use(
    '/resume',
    createResumeRouter(container.resumeService, container.resolveDemoUserId),
  );
  apiRouter.use(
    '/resume',
    createResumeDocsRouter(container.applicationDocsService, container.resolveDemoUserId),
  );
  apiRouter.use(
    '/cover-letter',
    createCoverLetterRouter(container.applicationDocsService, container.resolveDemoUserId),
  );

  // Mounted in later phases:
  // apiRouter.use('/applications', createApplicationRouter(...)); // Phase 6
  // apiRouter.use('/analytics', createAnalyticsRouter(...));   // Phase 9

  return apiRouter;
}
