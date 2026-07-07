import { JobSource, type NormalizedJob, RemoteType, type SearchQuery } from '@ajh/shared';
import { normalizeText } from '../utils/text.js';
import { BaseProvider } from './base.provider.js';
import { SAMPLE_JOBS } from './fixtures/sample-jobs.js';

/**
 * A fully-working provider backed by a fixed dataset. It exists so the entire
 * pipeline (search → dedup → persist → API) runs and is testable offline, and
 * as the reference implementation of the provider contract. In production it
 * stands in for a real source until a compliant integration is configured.
 */
export class SampleProvider extends BaseProvider {
  readonly source = JobSource.MANUAL;
  readonly displayName = 'Sample (fixture) source';

  protected fetch(query: SearchQuery): Promise<NormalizedJob[]> {
    return Promise.resolve(SAMPLE_JOBS.filter((job) => this.matches(job, query)));
  }

  private matches(job: NormalizedJob, query: SearchQuery): boolean {
    const haystack = normalizeText(
      [job.title, job.description, job.requirements ?? '', job.company].join(' '),
    );

    // Keywords: every keyword must appear (simple AND). `boolean` expressions
    // are honored by real providers; the sample keeps to keyword matching.
    const keywords = query.keywords.map(normalizeText).filter(Boolean);
    if (keywords.length > 0 && !keywords.every((kw) => haystack.includes(kw))) {
      return false;
    }

    // Exclusions
    const excludes = (query.excludeKeywords ?? []).map(normalizeText).filter(Boolean);
    if (excludes.some((kw) => haystack.includes(kw))) return false;

    // Company filter
    if (query.company && normalizeText(job.company) !== normalizeText(query.company)) {
      return false;
    }

    // Remote-type filter (independent; only applied when explicitly requested)
    if (query.remoteTypes && query.remoteTypes.length > 0) {
      if (!query.remoteTypes.includes(job.remoteType)) return false;
    }

    // Location filter: a remote job is location-agnostic and always passes;
    // otherwise the job location must overlap one of the requested locations.
    const locations = (query.locations ?? []).map(normalizeText).filter(Boolean);
    if (locations.length > 0 && job.remoteType !== RemoteType.REMOTE) {
      const jobLocation = normalizeText(job.location);
      const matchesLocation = locations.some(
        (loc) => jobLocation.includes(loc) || loc.includes(jobLocation),
      );
      if (!matchesLocation) return false;
    }

    return true;
  }
}
