import type { Request, RequestHandler, Response } from 'express';
import type { ApiSuccess } from '@ajh/shared';
import type { SchedulerService, SchedulerTask } from '../scheduler/scheduler.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ValidationError } from '../utils/errors.js';

const VALID: SchedulerTask[] = ['search', 'weekly'];

/** POST /scheduler/run/:task — manual trigger (admin only). */
export function createSchedulerController(scheduler: SchedulerService): { run: RequestHandler } {
  return {
    run: asyncHandler(async (req: Request, res: Response) => {
      const task = req.params.task as SchedulerTask;
      if (!VALID.includes(task)) {
        throw new ValidationError(`Unknown task '${task}'. Use one of: ${VALID.join(', ')}`);
      }
      await scheduler.runTask(task);
      const body: ApiSuccess<{ task: string; status: string }> = {
        ok: true,
        data: { task, status: 'completed' },
      };
      res.status(200).json(body);
    }),
  };
}
