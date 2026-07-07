import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { ISearchService } from '../services/index.js';
import { createSearchController } from '../controllers/search.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { searchQuerySchema } from '../controllers/schemas.js';

export function createSearchRouter(
  searchService: ISearchService,
  resolveDemoUserId: () => Promise<string>,
): Router {
  const router = Router();
  const controller = createSearchController(searchService, resolveDemoUserId);

  // Searches fan out to external providers, so throttle them harder than the
  // global limiter (spec §Search Strategy → Rate Limiting).
  const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  router.post('/', searchLimiter, validate(searchQuerySchema, 'body'), controller.run);

  return router;
}
