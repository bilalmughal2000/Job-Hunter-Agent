import { describe, expect, it } from 'vitest';
import { EmploymentType, JobSource, type NormalizedJob, RemoteType } from '@ajh/shared';
import { DeduplicationAgent } from '../src/agents/dedup/index.js';

function job(overrides: Partial<NormalizedJob>): NormalizedJob {
  return {
    title: 'Frontend Angular Developer',
    company: 'Tkxel',
    location: 'Lahore, Pakistan',
    country: 'Pakistan',
    employmentType: EmploymentType.FULL_TIME,
    remoteType: RemoteType.HYBRID,
    description: 'desc',
    url: 'https://a.example/1',
    source: JobSource.MANUAL,
    ...overrides,
  };
}

describe('DeduplicationAgent.dedupe', () => {
  const agent = new DeduplicationAgent();

  it('keeps distinct jobs', () => {
    const result = agent.dedupe([
      job({ url: 'https://a.example/1', title: 'Angular Dev' }),
      job({ url: 'https://b.example/2', title: 'React Dev', company: 'Other' }),
    ]);
    expect(result.unique).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(0);
  });

  it('removes exact URL duplicates (ignoring query/protocol/www)', () => {
    const result = agent.dedupe([
      job({ url: 'https://www.a.example/jobs/1' }),
      job({ url: 'http://a.example/jobs/1?utm=x', company: 'Different', title: 'Different Role' }),
    ]);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it('removes fuzzy duplicates across overlapping locations ("Lahore" vs "Lahore, Pakistan")', () => {
    const result = agent.dedupe([
      job({
        url: 'https://a.example/1',
        title: 'Frontend Angular Developer',
        location: 'Lahore, Pakistan',
      }),
      job({ url: 'https://b.example/2', title: 'Angular Frontend Developer', location: 'Lahore' }),
    ]);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(1);
  });

  it('does NOT merge the same title across different cities', () => {
    const result = agent.dedupe([
      job({ url: 'https://a/1', title: 'Angular Developer', location: 'Lahore' }),
      job({ url: 'https://b/2', title: 'Angular Developer', location: 'Karachi' }),
    ]);
    expect(result.unique).toHaveLength(2);
  });

  it('collapses near-identical titles at the same company+location', () => {
    const result = agent.dedupe([
      job({ url: 'https://a.example/1', title: 'Senior Angular Engineer', location: 'Lahore' }),
      job({ url: 'https://b.example/2', title: 'Angular Senior Engineer', location: 'Lahore' }),
    ]);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicatesRemoved).toBe(1);
  });
});

describe('DeduplicationAgent.isDuplicateOfExisting', () => {
  const agent = new DeduplicationAgent();

  it('matches an existing job by fingerprint', () => {
    const candidate = job({ url: 'https://new.example/9' });
    const existing = [{ url: 'https://old.example/1', dedupHash: agent.fingerprint(candidate) }];
    expect(agent.isDuplicateOfExisting(candidate, existing)).toBe(true);
  });

  it('matches an existing job by normalized URL', () => {
    const candidate = job({ url: 'https://www.new.example/9?x=1' });
    const existing = [{ url: 'http://new.example/9', dedupHash: 'unrelated' }];
    expect(agent.isDuplicateOfExisting(candidate, existing)).toBe(true);
  });

  it('returns false for a genuinely new job', () => {
    const candidate = job({ url: 'https://brand.new/1', title: 'Vue Dev', company: 'Zzz' });
    const existing = [{ url: 'https://old.example/1', dedupHash: 'x::y::z' }];
    expect(agent.isDuplicateOfExisting(candidate, existing)).toBe(false);
  });
});
