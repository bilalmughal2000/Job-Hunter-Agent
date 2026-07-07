import type { Request, RequestHandler, Response } from 'express';
import type {
  AnalyticsDTO,
  ApiSuccess,
  CareerAssistantDTO,
  SkillDemandDTO,
  WeeklyReportDTO,
} from '@ajh/shared';
import type { IAnalyticsService, ICareerAssistantService } from '../services/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UnauthorizedError } from '../utils/errors.js';

const userId = (req: Request): string => {
  if (!req.user) throw new UnauthorizedError('Authentication required');
  return req.user.id;
};

/** GET /analytics, GET /skills, GET/POST /reports. Auth required. */
export function createAnalyticsController(analytics: IAnalyticsService): {
  getAnalytics: RequestHandler;
  getSkills: RequestHandler;
  listReports: RequestHandler;
  generateReport: RequestHandler;
} {
  return {
    getAnalytics: asyncHandler(async (req: Request, res: Response) => {
      const data = await analytics.getAnalytics(userId(req));
      const body: ApiSuccess<AnalyticsDTO> = { ok: true, data };
      res.status(200).json(body);
    }),
    getSkills: asyncHandler(async (_req: Request, res: Response) => {
      const data = await analytics.listSkills();
      const body: ApiSuccess<SkillDemandDTO[]> = { ok: true, data };
      res.status(200).json(body);
    }),
    listReports: asyncHandler(async (req: Request, res: Response) => {
      const data = await analytics.listReports(userId(req));
      const body: ApiSuccess<WeeklyReportDTO[]> = { ok: true, data };
      res.status(200).json(body);
    }),
    generateReport: asyncHandler(async (req: Request, res: Response) => {
      const data = await analytics.generateWeeklyReport(userId(req));
      const body: ApiSuccess<WeeklyReportDTO> = { ok: true, data };
      res.status(201).json(body);
    }),
  };
}

/** GET /jobs/:id/assistant — the AI Career Assistant for a job. */
export function createCareerAssistantController(service: ICareerAssistantService): {
  assist: RequestHandler;
} {
  return {
    assist: asyncHandler(async (req: Request, res: Response) => {
      const data = await service.assist(userId(req), req.params.id as string);
      const body: ApiSuccess<CareerAssistantDTO> = { ok: true, data };
      res.status(200).json(body);
    }),
  };
}
