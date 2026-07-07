import type { JobSource, NormalizedJob, SearchQuery } from '@ajh/shared';
import { RateLimiter } from '../utils/rateLimiter.js';
import { withRetry } from '../utils/retry.js';
import type { JobSourceProvider, ProviderContext } from './types.js';

/**
 * Base class wiring the cross-cutting Search Strategy concerns (caching, rate
 * limiting, retry) once, so concrete providers implement only `fetch()`.
 */
export abstract class BaseProvider implements JobSourceProvider {
  abstract readonly source: JobSource;
  abstract readonly displayName: string;

  protected readonly rateLimiter: RateLimiter;

  constructor(protected readonly ctx: ProviderContext) {
    this.rateLimiter = new RateLimiter(ctx.rateLimitMs ?? 1_000);
  }

  /** Concrete providers fetch + normalize here. */
  protected abstract fetch(query: SearchQuery): Promise<NormalizedJob[]>;

  isAvailable(): boolean {
    return true;
  }

  async search(query: SearchQuery): Promise<NormalizedJob[]> {
    if (!this.isAvailable()) {
      this.ctx.logger.warn(
        { source: this.source },
        `${this.displayName} provider is unavailable (missing credentials or compliant integration) — skipping`,
      );
      return [];
    }

    const cacheKey = `provider:${this.source}:${this.cacheKey(query)}`;
    const cached = await this.ctx.cache.get<NormalizedJob[]>(cacheKey);
    if (cached) {
      this.ctx.logger.debug({ source: this.source }, 'provider cache hit');
      return cached;
    }

    const jobs = await withRetry(
      async () => {
        await this.rateLimiter.acquire();
        return this.fetch(query);
      },
      {
        retries: this.ctx.retries ?? 2,
        onRetry: (error, attempt) =>
          this.ctx.logger.warn({ source: this.source, attempt, error }, 'provider fetch retry'),
      },
    );

    await this.ctx.cache.set(cacheKey, jobs);
    return jobs;
  }

  /** Stable cache key for a query; overridable if a source ignores some fields. */
  protected cacheKey(query: SearchQuery): string {
    return JSON.stringify({
      k: [...query.keywords].sort(),
      x: [...(query.excludeKeywords ?? [])].sort(),
      b: query.boolean ?? null,
      l: [...(query.locations ?? [])].sort(),
      c: query.company ?? null,
      r: [...(query.remoteTypes ?? [])].sort(),
      p: query.page ?? 1,
    });
  }
}
