import {
  EmploymentType,
  JobSource,
  type NormalizedJob,
  RemoteType,
  type SearchQuery,
} from '@ajh/shared';
import { BaseProvider } from './base.provider.js';

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

const EMPLOYMENT_MAP: Record<string, EmploymentType> = {
  full_time: EmploymentType.FULL_TIME,
  part_time: EmploymentType.PART_TIME,
  contract: EmploymentType.CONTRACT,
  internship: EmploymentType.INTERNSHIP,
  freelance: EmploymentType.CONTRACT,
};

/** Strip HTML tags/entities from Remotive's rich-text description. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Real, free, key-less provider backed by Remotive's public jobs API
 * (https://remotive.com/api/remote-jobs). Returns live remote tech jobs
 * matching the query. ToS-compliant: Remotive offers this endpoint publicly
 * for job boards.
 */
export class RemotiveProvider extends BaseProvider {
  readonly source = JobSource.REMOTIVE;
  readonly displayName = 'Remotive (live remote jobs)';

  private readonly baseUrl = 'https://remotive.com/api/remote-jobs';
  private readonly limit = 40;

  protected async fetch(query: SearchQuery): Promise<NormalizedJob[]> {
    const search = query.keywords.join(' ').trim() || 'angular';
    const url = `${this.baseUrl}?search=${encodeURIComponent(search)}&limit=${this.limit}`;

    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Remotive request failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as RemotiveResponse;
    const jobs = data.jobs ?? [];

    const keywords = query.keywords.map((k) => k.toLowerCase()).filter(Boolean);
    const excludes = (query.excludeKeywords ?? []).map((k) => k.toLowerCase());

    return jobs
      .map((j) => this.normalize(j))
      .filter((j) => {
        const hay = `${j.title} ${j.description} ${j.company}`.toLowerCase();
        // Keep jobs matching any requested keyword; drop excluded terms.
        if (keywords.length > 0 && !keywords.some((k) => hay.includes(k))) return false;
        if (excludes.some((k) => hay.includes(k))) return false;
        return true;
      });
  }

  private normalize(j: RemotiveJob): NormalizedJob {
    const location = j.candidate_required_location?.trim() || 'Remote';
    return {
      title: j.title,
      company: j.company_name,
      location,
      country: /worldwide|anywhere|remote/i.test(location) ? 'Remote' : location,
      salary: j.salary?.trim() ? j.salary.trim() : null,
      experience: null,
      employmentType: EMPLOYMENT_MAP[j.job_type ?? ''] ?? EmploymentType.UNKNOWN,
      remoteType: RemoteType.REMOTE,
      description: stripHtml(j.description ?? '').slice(0, 5000),
      requirements: null,
      benefits: null,
      url: j.url,
      source: JobSource.REMOTIVE,
      postedDate: j.publication_date ?? null,
      externalId: String(j.id),
    };
  }
}
