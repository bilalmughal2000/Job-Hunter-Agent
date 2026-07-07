import { describe, expect, it } from 'vitest';
import {
  averageSalaryLabel,
  bucketByDay,
  parseSalaryToNumber,
  successRate,
  tallyTop,
} from '../src/agents/analytics/index.js';

describe('parseSalaryToNumber', () => {
  it('parses ranges to a midpoint', () => {
    expect(parseSalaryToNumber('PKR 250,000 - 400,000')).toBe(325000);
  });
  it('honors k suffixes', () => {
    expect(parseSalaryToNumber('$90k - $120k')).toBe(105000);
  });
  it('returns null for non-numeric', () => {
    expect(parseSalaryToNumber('Competitive')).toBeNull();
    expect(parseSalaryToNumber(null)).toBeNull();
  });
});

describe('averageSalaryLabel', () => {
  it('averages parseable salaries and skips the rest', () => {
    expect(averageSalaryLabel(['$100k', '$200k', 'Negotiable'])).toBe('150,000');
  });
  it('is null when nothing parses', () => {
    expect(averageSalaryLabel(['n/a', null])).toBeNull();
  });
});

describe('bucketByDay', () => {
  it('produces one bucket per day and counts matches', () => {
    const today = new Date('2026-07-08T12:00:00Z');
    const dates = [
      new Date('2026-07-08T09:00:00Z'),
      new Date('2026-07-07T10:00:00Z'),
      new Date('2026-07-07T22:00:00Z'),
    ];
    const b = bucketByDay(dates, 3, today);
    expect(b).toHaveLength(3);
    expect(b.at(-1)).toEqual({ date: '2026-07-08', count: 1 });
    expect(b.find((x) => x.date === '2026-07-07')?.count).toBe(2);
  });
});

describe('successRate & tallyTop', () => {
  it('computes success rate', () => {
    expect(successRate(2, 8)).toBe(25);
    expect(successRate(0, 0)).toBe(0);
  });
  it('ranks occurrences', () => {
    const top = tallyTop(['Azure', 'Azure', 'NgRx', 'Azure', 'NgRx']);
    expect(top[0]).toEqual({ label: 'Azure', count: 3 });
    expect(top[1]).toEqual({ label: 'NgRx', count: 2 });
  });
});
