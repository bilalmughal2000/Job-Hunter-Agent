import { Router } from 'express';
import type { INotificationService, IJobService } from '../services/index.js';
import { createNotificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { notifySchema, paginationQuerySchema } from '../controllers/schemas.js';

export function createNotificationRouter(
  notifications: INotificationService,
  jobService: IJobService,
): Router {
  const router = Router();
  const c = createNotificationController(notifications, jobService);

  router.use(requireAuth);
  router.get('/', validate(paginationQuerySchema, 'query'), c.list);
  router.post('/', validate(notifySchema, 'body'), c.notify);

  return router;
}
