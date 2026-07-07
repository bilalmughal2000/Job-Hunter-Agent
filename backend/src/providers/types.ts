import type { JobSource, NormalizedJob, SearchQuery } from '@ajh/shared';
import type { Cache } from '../utils/cache.js';
import type { Logger } from '../utils/logger.js';

/**
 * Contract every job source must implement. Providers are pluggable and
 * independently testable (spec constraint #5). A provider is responsible only
 * for fetching + normalizing jobs from ONE source; retry / rate-limit / cache
 * are provided by BaseProvider so each source implements just `fetch()`.
 */
export interface JobSourceProvider {
  readonly source: JobSource;
  readonly displayName: string;
  /** Whether this provider can actually run (e.g. has credentials / a compliant integration). */
  isAvailable(): boolean;
  search(query: SearchQuery): Promise<NormalizedJob[]>;
}

/** Shared dependencies injected into every provider. */
export interface ProviderContext {
  cache: Cache;
  logger: Logger;
  /** Minimum spacing between calls to a source, in ms. */
  rateLimitMs?: number;
  /** Retry attempts for transient fetch failures. */
  retries?: number;
}
