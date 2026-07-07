import { DeduplicationAgent } from './agents/dedup/index.js';
import { SearchAgent } from './agents/search/index.js';
import { buildDefaultRegistry } from './providers/index.js';
import { CompanyRepository, JobRepository, SearchHistoryRepository } from './repositories/index.js';
import { JobService, SearchService } from './services/index.js';
import type { IJobService, ISearchService } from './services/index.js';
import { prisma } from './database/index.js';
import { InMemoryCache } from './utils/cache.js';
import { logger } from './utils/logger.js';

/** The set of dependencies the HTTP layer needs. Injected into the app. */
export interface AppContainer {
  jobService: IJobService;
  searchService: ISearchService;
  /** Resolves a fallback user id until auth exists (Phase 6). */
  resolveDemoUserId: () => Promise<string>;
}

/** Builds the production container wired to Prisma + the default providers. */
export function buildContainer(): AppContainer {
  const dedup = new DeduplicationAgent();
  const registry = buildDefaultRegistry({
    cache: new InMemoryCache(),
    logger,
    rateLimitMs: 500,
    retries: 2,
  });
  const searchAgent = new SearchAgent(registry, dedup, logger);

  const jobRepo = new JobRepository(prisma);
  const companyRepo = new CompanyRepository(prisma);
  const searchHistoryRepo = new SearchHistoryRepository(prisma);

  const jobService = new JobService(jobRepo, companyRepo, dedup);
  const searchService = new SearchService(searchAgent, jobService, searchHistoryRepo, logger);

  const resolveDemoUserId = async (): Promise<string> => {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!user) {
      throw new Error('No user found — run `npm run prisma:seed` to create the demo user');
    }
    return user.id;
  };

  return { jobService, searchService, resolveDemoUserId };
}
