import type { JobSource } from '@ajh/shared';
import type { JobSourceProvider } from './types.js';

/**
 * Holds the set of pluggable providers. The Search Agent asks the registry for
 * available providers (optionally filtered to a requested subset of sources).
 */
export class ProviderRegistry {
  private readonly providers = new Map<JobSource, JobSourceProvider>();

  register(provider: JobSourceProvider): this {
    this.providers.set(provider.source, provider);
    return this;
  }

  get(source: JobSource): JobSourceProvider | undefined {
    return this.providers.get(source);
  }

  all(): JobSourceProvider[] {
    return [...this.providers.values()];
  }

  /** Available providers, optionally restricted to `sources` (empty = all). */
  available(sources?: JobSource[]): JobSourceProvider[] {
    const wanted = sources && sources.length > 0 ? new Set(sources) : null;
    return this.all().filter((p) => p.isAvailable() && (wanted === null || wanted.has(p.source)));
  }
}
