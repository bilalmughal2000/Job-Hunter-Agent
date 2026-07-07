import type { DedupResult, NormalizedJob } from '@ajh/shared';
import {
  jaccardSimilarity,
  jobFingerprint,
  locationsOverlap,
  normalizeText,
  normalizeUrl,
} from '../../utils/text.js';

export interface DedupOptions {
  /** Title similarity (0–1) above which two same-company jobs are considered dupes. */
  titleSimilarityThreshold?: number;
}

/**
 * Deduplication Agent. Pure and independently testable (spec constraint #6).
 * Detects duplicates by, in order of strength:
 *   1. normalized URL (exact)
 *   2. exact fingerprint of company + title + location
 *   3. same normalized company + location + high title similarity (fuzzy)
 */
export class DeduplicationAgent {
  private readonly titleThreshold: number;

  constructor(options: DedupOptions = {}) {
    this.titleThreshold = options.titleSimilarityThreshold ?? 0.8;
  }

  /** Stable fingerprint for a job — also persisted as `Job.dedupHash`. */
  fingerprint(job: NormalizedJob): string {
    return jobFingerprint(job.company, job.title, job.location);
  }

  /** Remove duplicates within a single batch, keeping the first occurrence. */
  dedupe(jobs: NormalizedJob[]): DedupResult {
    const seenUrls = new Set<string>();
    const seenFingerprints = new Set<string>();
    const unique: NormalizedJob[] = [];

    for (const job of jobs) {
      const url = normalizeUrl(job.url);
      if (seenUrls.has(url)) continue;

      const fp = this.fingerprint(job);
      if (seenFingerprints.has(fp)) {
        seenUrls.add(url);
        continue;
      }

      // Fuzzy: same company + overlapping location, near-identical title.
      const fuzzyDupe = unique.some(
        (kept) =>
          normalizeText(kept.company) === normalizeText(job.company) &&
          locationsOverlap(kept.location, job.location) &&
          jaccardSimilarity(kept.title, job.title) >= this.titleThreshold,
      );
      if (fuzzyDupe) {
        seenUrls.add(url);
        continue;
      }

      seenUrls.add(url);
      seenFingerprints.add(fp);
      unique.push(job);
    }

    return { unique, duplicatesRemoved: jobs.length - unique.length };
  }

  /**
   * True if `job` duplicates any already-persisted job, matched by normalized
   * URL or fingerprint. Used to avoid re-inserting jobs across search runs.
   */
  isDuplicateOfExisting(
    job: NormalizedJob,
    existing: { url: string; dedupHash: string | null }[],
  ): boolean {
    const url = normalizeUrl(job.url);
    const fp = this.fingerprint(job);
    return existing.some((e) => normalizeUrl(e.url) === url || e.dedupHash === fp);
  }
}
