import { Router } from 'express';
import type { AppContainer } from '../container.js';
import { healthRouter } from './health.routes.js';
import { createJobRouter } from './job.routes.js';
import { createSearchRouter } from './search.routes.js';
import { createResumeRouter } from './resume.routes.js';
import { createCoverLetterRouter, createJobAiRouter, createResumeDocsRouter } from './ai.routes.js';
import { createAuthRouter } from './auth.routes.js';
import { createApplicationRouter } from './application.routes.js';
import { createNotificationRouter } from './notification.routes.js';
import { attachUser } from '../middlewares/auth.middleware.js';

/**
 * Root API router. Feature routers are wired from the injected container so
 * the whole graph is swappable in tests.
 */
export function createApiRouter(container: AppContainer): Router {
  const apiRouter = Router();

  // Populate req.user from a JWT when present (optional — never rejects).
  apiRouter.use(attachUser);

  apiRouter.use('/health', healthRouter);
  apiRouter.use('/auth', createAuthRouter(container.authService));
  apiRouter.use('/applications', createApplicationRouter(container.applicationService));
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
  apiRouter.use(
    '/notifications',
    createNotificationRouter(container.notificationService, container.jobService),
  );

  // apiRouter.use('/analytics', createAnalyticsRouter(...));   // Phase 9

  return apiRouter;
}
