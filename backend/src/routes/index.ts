import { Router } from 'express';
import type { AppContainer } from '../container.js';
import { healthRouter } from './health.routes.js';
import { createJobRouter } from './job.routes.js';
import { createSearchRouter } from './search.routes.js';

/**
 * Root API router. Feature routers are wired from the injected container so
 * the whole graph is swappable in tests.
 */
export function createApiRouter(container: AppContainer): Router {
  const apiRouter = Router();

  apiRouter.use('/health', healthRouter);
  apiRouter.use('/jobs', createJobRouter(container.jobService));
  apiRouter.use(
    '/search',
    createSearchRouter(container.searchService, container.resolveDemoUserId),
  );

  // Mounted in later phases:
  // apiRouter.use('/resume', createResumeRouter(...));        // Phase 4
  // apiRouter.use('/applications', createApplicationRouter(...)); // Phase 6
  // apiRouter.use('/analytics', createAnalyticsRouter(...));   // Phase 9

  return apiRouter;
}
