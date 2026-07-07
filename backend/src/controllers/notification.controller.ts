import type { Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, NotificationDTO, NotifyResult, Paginated } from '@ajh/shared';
import type { INotificationService, IJobService } from '../services/index.js';
import { newJobAlert, testNotification } from '../agents/notification/index.js';
import type { NotificationMessage } from '../agents/notification/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getValidatedQuery } from '../middlewares/validate.middleware.js';
import { UnauthorizedError } from '../utils/errors.js';
import { paginationQuerySchema } from './schemas.js';

/** Notifications: send (test or job alert) + list the user's feed. Auth required. */
export function createNotificationController(
  notifications: INotificationService,
  jobService: IJobService,
): { notify: RequestHandler; list: RequestHandler } {
  const userId = (req: Request): string => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    return req.user.id;
  };

  const notify = asyncHandler(async (req: Request, res: Response) => {
    const { jobId, subject, body } = req.body as {
      jobId?: string;
      subject?: string;
      body?: string;
    };

    let message: NotificationMessage;
    if (jobId) {
      const job = await jobService.getById(jobId);
      message = newJobAlert({
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        matchScore: job.matchScore,
        missingSkills: job.missingSkills,
        url: job.url,
      });
    } else if (subject || body) {
      message = { subject: subject ?? 'AI Job Hunter', body: body ?? '' };
    } else {
      message = testNotification();
    }

    const data = await notifications.notify(userId(req), message);
    const resp: ApiSuccess<NotifyResult> = { ok: true, data };
    res.status(200).json(resp);
  });

  const list = asyncHandler(async (req: Request, res: Response) => {
    const filter = getValidatedQuery(req, paginationQuerySchema);
    const data = await notifications.list(userId(req), filter);
    const resp: ApiSuccess<Paginated<NotificationDTO>> = { ok: true, data };
    res.status(200).json(resp);
  });

  return { notify, list };
}
