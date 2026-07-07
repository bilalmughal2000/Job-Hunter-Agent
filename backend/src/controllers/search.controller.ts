import type { Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, SearchQuery, SearchRunSummary } from '@ajh/shared';
import type { ISearchService } from '../services/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { resolveActingUser } from './requestUser.js';

export function createSearchController(
  searchService: ISearchService,
  resolveDemoUserId: () => Promise<string>,
): { run: RequestHandler } {
  const run = asyncHandler(async (req: Request, res: Response) => {
    const query = req.body as SearchQuery;
    const userId = await resolveActingUser(req, resolveDemoUserId);

    const summary = await searchService.run(userId, query);
    const body: ApiSuccess<SearchRunSummary> = { ok: true, data: summary };
    res.status(200).json(body);
  });

  return { run };
}
