import type { SearchQuery, SearchRunSummary } from '@ajh/shared';
import type { SearchAgent } from '../agents/search/index.js';
import type { ISearchHistoryRepository } from '../repositories/index.js';
import type { Logger } from '../utils/logger.js';
import type { IJobService, ISearchService } from './types.js';

/**
 * Orchestrates a search run: fan-out via the Search Agent, persist newly-found
 * jobs, and record the run in SearchHistory (even on failure).
 */
export class SearchService implements ISearchService {
  constructor(
    private readonly searchAgent: SearchAgent,
    private readonly jobService: IJobService,
    private readonly searchHistory: ISearchHistoryRepository,
    private readonly logger: Logger,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async run(userId: string, query: SearchQuery): Promise<SearchRunSummary> {
    const startedAt = this.now();
    try {
      const result = await this.searchAgent.run(query);
      const newlyPersisted = await this.jobService.persistNewJobs(result.jobs);
      const durationMs = this.now() - startedAt;

      const summary: SearchRunSummary = {
        totalFound: result.totalFound,
        afterDedup: result.jobs.length,
        newlyPersisted,
        durationMs,
        bySource: result.bySource,
        errors: result.errors,
      };

      await this.searchHistory.record({
        userId,
        criteria: query,
        resultsCount: result.totalFound,
        newCount: newlyPersisted,
        durationMs,
        error: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      });

      return summary;
    } catch (error) {
      const durationMs = this.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error({ error, userId }, 'search run failed');
      await this.searchHistory
        .record({
          userId,
          criteria: query,
          resultsCount: 0,
          newCount: 0,
          durationMs,
          error: message,
        })
        .catch(() => undefined);
      throw error;
    }
  }
}
