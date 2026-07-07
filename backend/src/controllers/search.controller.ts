import type { Request, RequestHandler, Response } from 'express';
import type { ApiSuccess, SearchQuery, SearchRunSummary } from '@ajh/shared';
import type { ISearchService } from '../services/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Resolves the acting user. Auth lands in Phase 6; until then we accept an
 * `x-user-id` header and fall back to the seeded demo user so the endpoint is
 * exercisable end-to-end.
 */
const DEMO_USER_HEADER = 'x-user-id';

export function createSearchController(
  searchService: ISearchService,
  resolveDemoUserId: () => Promise<string>,
): { run: RequestHandler } {
  const run = asyncHandler(async (req: Request, res: Response) => {
    const query = req.body as SearchQuery;
    const headerUser = req.header(DEMO_USER_HEADER);
    const userId = headerUser ?? (await resolveDemoUserId());

    const summary = await searchService.run(userId, query);
    const body: ApiSuccess<SearchRunSummary> = { ok: true, data: summary };
    res.status(200).json(body);
  });

  return { run };
}
