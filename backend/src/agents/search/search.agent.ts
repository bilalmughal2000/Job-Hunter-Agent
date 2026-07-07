import type { NormalizedJob, SearchQuery } from '@ajh/shared';
import type { DeduplicationAgent } from '../dedup/index.js';
import type { ProviderRegistry } from '../../providers/index.js';
import type { Logger } from '../../utils/logger.js';

export interface SearchAgentResult {
  jobs: NormalizedJob[];
  totalFound: number;
  duplicatesRemoved: number;
  bySource: Record<string, number>;
  errors: { source: string; message: string }[];
}

/**
 * Search Agent. Fans a query out across all available providers concurrently,
 * isolates per-provider failures (one bad source never sinks the run), then
 * hands the combined batch to the Deduplication Agent. Independently testable
 * with mock providers (spec constraint #6).
 */
export class SearchAgent {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly dedup: DeduplicationAgent,
    private readonly logger: Logger,
  ) {}

  async run(query: SearchQuery): Promise<SearchAgentResult> {
    const providers = this.registry.available(query.sources);
    const bySource: Record<string, number> = {};
    const errors: { source: string; message: string }[] = [];

    const settled = await Promise.allSettled(
      providers.map(async (provider) => {
        const jobs = await provider.search(query);
        return { source: provider.source, jobs };
      }),
    );

    const collected: NormalizedJob[] = [];
    settled.forEach((result, i) => {
      const provider = providers[i];
      if (!provider) return;
      if (result.status === 'fulfilled') {
        bySource[result.value.source] = result.value.jobs.length;
        collected.push(...result.value.jobs);
      } else {
        const message =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push({ source: provider.source, message });
        this.logger.error({ source: provider.source, error: result.reason }, 'provider failed');
      }
    });

    const { unique, duplicatesRemoved } = this.dedup.dedupe(collected);
    this.logger.info(
      { totalFound: collected.length, afterDedup: unique.length, duplicatesRemoved },
      'search agent completed',
    );

    return {
      jobs: unique,
      totalFound: collected.length,
      duplicatesRemoved,
      bySource,
      errors,
    };
  }
}
