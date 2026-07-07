import type { JobSource, NormalizedJob, SearchQuery } from '@ajh/shared';
import { BaseProvider } from './base.provider.js';
import type { ProviderContext } from './types.js';

/**
 * Placeholder for a real job source that requires an official API key, an
 * authorized data export, or another compliant integration (spec constraint #8:
 * respect every platform's Terms of Service — no unauthorized scraping).
 *
 * It is intentionally `isAvailable() === false` until credentials are provided,
 * so the Search Agent skips it cleanly instead of pretending to have results.
 * Wiring a compliant integration = subclassing BaseProvider with a real
 * `fetch()`, exactly like SampleProvider.
 */
export class CompliantStubProvider extends BaseProvider {
  readonly source: JobSource;
  readonly displayName: string;
  private readonly available: boolean;

  constructor(
    ctx: ProviderContext,
    config: { source: JobSource; displayName: string; available?: boolean },
  ) {
    super(ctx);
    this.source = config.source;
    this.displayName = config.displayName;
    this.available = config.available ?? false;
  }

  override isAvailable(): boolean {
    return this.available;
  }

  protected fetch(_query: SearchQuery): Promise<NormalizedJob[]> {
    // Only reached if a subclass/config marks it available without a real impl.
    return Promise.resolve([]);
  }
}
