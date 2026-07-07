import {
  EmploymentType,
  JobSource,
  type NormalizedJob,
  RemoteType,
  type SearchQuery,
} from '@ajh/shared';
import { BaseProvider } from './base.provider.js';
import type { ProviderContext } from './types.js';

interface JSearchJob {
  job_id?: string;
  employer_name?: string;
  job_title?: string;
  job_apply_link?: string;
  job_description?: string;
  job_city?: string | null;
  job_country?: string | null;
  job_is_remote?: boolean;
  job_employment_type?: string;
  job_posted_at_datetime_utc?: string;
  job_publisher?: string;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
}

interface JSearchResponse {
  // /search-v2 nests jobs under data.jobs (with a cursor); tolerate a flat array too.
  data?: { jobs?: JSearchJob[]; cursor?: string } | JSearchJob[];
}

const EMPLOYMENT_MAP: Record<string, EmploymentType> = {
  FULLTIME: EmploymentType.FULL_TIME,
  PARTTIME: EmploymentType.PART_TIME,
  CONTRACTOR: EmploymentType.CONTRACT,
  INTERN: EmploymentType.INTERNSHIP,
};

/** Map the aggregator's publisher to our source enum (so LinkedIn/Indeed show as such). */
function publisherToSource(publisher: string | undefined): JobSource {
  const p = (publisher ?? '').toLowerCase();
  if (p.includes('linkedin')) return JobSource.LINKEDIN;
  if (p.includes('indeed')) return JobSource.INDEED;
  if (p.includes('wellfound') || p.includes('angel')) return JobSource.WELLFOUND;
  if (p.includes('greenhouse')) return JobSource.GREENHOUSE;
  if (p.includes('lever')) return JobSource.LEVER;
  if (p.includes('google')) return JobSource.GOOGLE_JOBS;
  return JobSource.COMPANY_CAREER;
}

/**
 * Real jobs via JSearch (RapidAPI), which aggregates Google-for-Jobs results —
 * including LinkedIn, Indeed, Glassdoor, ZipRecruiter — and supports arbitrary
 * locations (e.g. "Lahore, Pakistan"). Each job carries a real apply link.
 * Enabled only when JSEARCH_API_KEY is configured (free RapidAPI key).
 */
export class JSearchProvider extends BaseProvider {
  readonly source = JobSource.GOOGLE_JOBS;
  readonly displayName = 'JSearch (LinkedIn/Indeed/Google via RapidAPI)';

  constructor(
    ctx: ProviderContext,
    private readonly apiKey: string,
    private readonly host = 'jsearch.p.rapidapi.com',
  ) {
    super(ctx);
  }

  override isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  protected async fetch(query: SearchQuery): Promise<NormalizedJob[]> {
    const terms = query.keywords.join(' ').trim() || 'frontend developer';
    const location = (query.locations ?? [])[0];
    const q = location ? `${terms} in ${location}` : terms;
    // /search-v2 parses the location from the query text (e.g. "in Lahore, Pakistan").
    const url = `https://${this.host}/search-v2?query=${encodeURIComponent(q)}&num_pages=1&date_posted=all`;

    const res = await fetch(url, {
      headers: { 'x-rapidapi-key': this.apiKey, 'x-rapidapi-host': this.host },
    });
    if (res.status === 404 || res.status === 403) {
      // Subscription/endpoint misconfig (e.g. no /search on this plan). Don't
      // sink the whole search run — log and contribute nothing.
      this.ctx.logger.warn(
        { status: res.status, host: this.host },
        'JSearch unavailable (check your RapidAPI subscription exposes GET /search) — skipping',
      );
      return [];
    }
    if (!res.ok) {
      throw new Error(`JSearch request failed: ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as JSearchResponse;
    const jobs = Array.isArray(body.data) ? body.data : (body.data?.jobs ?? []);
    const excludes = (query.excludeKeywords ?? []).map((k) => k.toLowerCase());

    return jobs
      .filter((j) => j.job_title && j.job_apply_link)
      .map((j) => this.normalize(j))
      .filter((j) => {
        const hay = `${j.title} ${j.description}`.toLowerCase();
        return !excludes.some((k) => hay.includes(k));
      });
  }

  private normalize(j: JSearchJob): NormalizedJob {
    const city = j.job_city?.trim();
    const country = j.job_country?.trim();
    const location = j.job_is_remote
      ? 'Remote'
      : [city, country].filter(Boolean).join(', ') || 'Unspecified';
    const salary =
      j.job_min_salary && j.job_max_salary ? `${j.job_min_salary} - ${j.job_max_salary}` : null;
    return {
      title: j.job_title ?? 'Untitled',
      company: j.employer_name ?? 'Unknown',
      location,
      country: country || (j.job_is_remote ? 'Remote' : 'Unspecified'),
      salary,
      experience: null,
      employmentType: EMPLOYMENT_MAP[j.job_employment_type ?? ''] ?? EmploymentType.UNKNOWN,
      remoteType: j.job_is_remote ? RemoteType.REMOTE : RemoteType.ON_SITE,
      description: (j.job_description ?? '').slice(0, 5000),
      requirements: null,
      benefits: null,
      url: j.job_apply_link ?? '',
      source: publisherToSource(j.job_publisher),
      postedDate: j.job_posted_at_datetime_utc ?? null,
      externalId: j.job_id ?? null,
    };
  }
}
