import {
  EmploymentType,
  JobSource,
  type NormalizedJob,
  RemoteType,
  type SearchQuery,
} from '@ajh/shared';
import { BaseProvider } from './base.provider.js';

interface RemoteOkJob {
  id?: string | number;
  slug?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  date?: string;
  url?: string;
  /** First element of the feed is a legal/metadata notice (no `position`). */
  legal?: string;
}

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
 * Real, free, key-less provider backed by RemoteOK's public feed
 * (https://remoteok.com/api). The feed returns all current remote jobs (no
 * server-side search), so we filter client-side by the query keywords.
 * ToS: RemoteOK offers this feed publicly; we send a descriptive User-Agent and
 * link back via the job URL (attribution).
 */
export class RemoteOkProvider extends BaseProvider {
  readonly source = JobSource.REMOTEOK;
  readonly displayName = 'RemoteOK (live remote jobs)';

  private readonly apiUrl = 'https://remoteok.com/api';

  protected async fetch(query: SearchQuery): Promise<NormalizedJob[]> {
    const res = await fetch(this.apiUrl, {
      headers: {
        accept: 'application/json',
        'user-agent': 'ai-job-hunter/1.0 (+https://github.com/bilalmughal2000/Job-Hunter-Agent)',
      },
    });
    if (!res.ok) {
      throw new Error(`RemoteOK request failed: ${res.status} ${res.statusText}`);
    }
    const raw = (await res.json()) as RemoteOkJob[];
    // Drop the leading legal notice and any entries without a position.
    const jobs = raw.filter((j) => j.position && j.company);

    const keywords = query.keywords.map((k) => k.toLowerCase()).filter(Boolean);
    const excludes = (query.excludeKeywords ?? []).map((k) => k.toLowerCase());

    return jobs
      .map((j) => this.normalize(j))
      .filter((j) => {
        const hay =
          `${j.title} ${j.description} ${j.company} ${j.requirements ?? ''}`.toLowerCase();
        // Any keyword match (RemoteOK's feed is small + unsearchable, so be lenient).
        if (keywords.length > 0 && !keywords.some((k) => hay.includes(k))) return false;
        if (excludes.some((k) => hay.includes(k))) return false;
        return true;
      });
  }

  private normalize(j: RemoteOkJob): NormalizedJob {
    const location = j.location?.trim() || 'Remote';
    const salary = j.salary_min && j.salary_max ? `$${j.salary_min} - $${j.salary_max}` : null;
    const tags = (j.tags ?? []).join(', ');
    return {
      title: j.position ?? 'Untitled',
      company: j.company ?? 'Unknown',
      location,
      country: /worldwide|anywhere|remote/i.test(location) ? 'Remote' : location,
      salary,
      experience: null,
      employmentType: EmploymentType.UNKNOWN,
      remoteType: RemoteType.REMOTE,
      description: `${stripHtml(j.description ?? '')}${tags ? `\n\nTags: ${tags}` : ''}`.slice(
        0,
        5000,
      ),
      requirements: tags || null,
      benefits: null,
      url: j.url ?? `https://remoteok.com/l/${j.id ?? ''}`,
      source: JobSource.REMOTEOK,
      postedDate: j.date ?? null,
      externalId: String(j.id ?? j.slug ?? ''),
    };
  }
}
