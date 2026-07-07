import type { Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, JobAnalysis, MatchResult } from '@ajh/shared';
import type { IJobAnalysisService, IMatchingService } from '../services/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { resolveActingUser } from './requestUser.js';

/** Job-scoped AI endpoints: analyze a job, match it against a resume. */
export function createJobAiController(
  analysisService: IJobAnalysisService,
  matchingService: IMatchingService,
  resolveDemoUserId: () => Promise<string>,
): { analyze: RequestHandler; match: RequestHandler } {
  const analyze = asyncHandler(async (req: Request, res: Response) => {
    const data = await analysisService.analyze(req.params.id as string);
    const body: ApiSuccess<JobAnalysis> = { ok: true, data };
    res.status(200).json(body);
  });

  const match = asyncHandler(async (req: Request, res: Response) => {
    const userId = await resolveActingUser(req, resolveDemoUserId);
    const { resumeId } = req.body as { resumeId?: string };
    const data = await matchingService.match(userId, req.params.id as string, resumeId);
    const body: ApiSuccess<MatchResult> = { ok: true, data };
    res.status(200).json(body);
  });

  return { analyze, match };
}
