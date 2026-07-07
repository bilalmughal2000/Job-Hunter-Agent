import { describe, expect, it } from 'vitest';
import { jaccardSimilarity, normalizeText, normalizeUrl } from '../src/utils/text.js';

describe('normalizeText', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalizeText('  Senior  Angular/Frontend  Dev! ')).toBe('senior angular frontend dev');
  });
});

describe('normalizeUrl', () => {
  it('drops protocol, www, query, hash and trailing slash', () => {
    expect(normalizeUrl('https://www.Example.com/Jobs/123/?ref=x#top')).toBe(
      'example.com/jobs/123',
    );
  });

  it('falls back to a trimmed lowercase string for invalid URLs', () => {
    expect(normalizeUrl('  NOT a url ')).toBe('not a url');
  });
});

describe('jaccardSimilarity', () => {
  it('is 1 for identical token sets regardless of order/case', () => {
    expect(jaccardSimilarity('Angular Frontend Developer', 'developer frontend angular')).toBe(1);
  });

  it('is 0 for fully disjoint strings', () => {
    expect(jaccardSimilarity('react native', 'python django')).toBe(0);
  });

  it('is between 0 and 1 for partial overlap', () => {
    const score = jaccardSimilarity('Frontend Angular Developer', 'Angular Frontend Engineer');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('treats two empty strings as identical', () => {
    expect(jaccardSimilarity('', '')).toBe(1);
  });
});
