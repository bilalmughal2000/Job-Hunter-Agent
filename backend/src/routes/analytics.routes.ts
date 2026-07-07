import { Router } from 'express';
import type { IAnalyticsService, ICareerAssistantService } from '../services/index.js';
import type { SchedulerService } from '../scheduler/scheduler.service.js';
import {
  createAnalyticsController,
  createCareerAssistantController,
} from '../controllers/analytics.controller.js';
import { createSchedulerController } from '../controllers/scheduler.controller.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware.js';

/** /analytics, /skills, /reports (auth). */
export function createAnalyticsRouter(analytics: IAnalyticsService): Router {
  const router = Router();
  const c = createAnalyticsController(analytics);
  // Per-route auth (not router.use) so this '/'-mounted router doesn't turn
  // requireAuth into a catch-all over every unmatched API path.
  router.get('/analytics', requireAuth, c.getAnalytics);
  router.get('/skills', requireAuth, c.getSkills);
  router.get('/reports', requireAuth, c.listReports);
  router.post('/reports', requireAuth, c.generateReport);
  return router;
}

/** POST /scheduler/run/:task — admin only. */
export function createSchedulerRouter(scheduler: SchedulerService): Router {
  const router = Router();
  const c = createSchedulerController(scheduler);
  router.post('/run/:task', requireAuth, requireAdmin, c.run);
  return router;
}

/** Career-assistant sub-router mounted under /jobs. */
export function createCareerAssistantRouter(service: ICareerAssistantService): Router {
  const router = Router();
  const c = createCareerAssistantController(service);
  router.get('/:id/assistant', requireAuth, c.assist);
  return router;
}
