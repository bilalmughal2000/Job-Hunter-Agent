/**
 * Pure analytics helpers (Analytics Agent). Dependency-free and unit-testable;
 * the AnalyticsService feeds them DB aggregates.
 */

/** Extract a representative numeric salary from a free-text string, or null. */
export function parseSalaryToNumber(salary: string | null | undefined): number | null {
  if (!salary) return null;
  // Grab number groups, honoring "k" suffixes (e.g. "$90k", "PKR 250,000").
  const matches = [...salary.matchAll(/(\d[\d,.]*)\s*(k)?/gi)];
  const nums: number[] = [];
  for (const m of matches) {
    const raw = Number((m[1] ?? '').replace(/,/g, ''));
    if (Number.isNaN(raw) || raw === 0) continue;
    nums.push(m[2] ? raw * 1000 : raw);
  }
  if (nums.length === 0) return null;
  // Use the midpoint of a range, else the single value.
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return Math.round((min + max) / 2);
}

/** Average of parseable salaries, formatted; null if none parse. */
export function averageSalaryLabel(salaries: (string | null)[], currency = ''): string | null {
  const nums = salaries.map(parseSalaryToNumber).filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  const avg = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
  return `${currency}${avg.toLocaleString('en-US')}`;
}

/** Bucket ISO/Date timestamps into per-day counts for the last `days` days. */
export function bucketByDay(
  dates: Date[],
  days: number,
  today: Date,
): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

/** Offer conversion rate over submitted applications, 0–100. */
export function successRate(offers: number, submitted: number): number {
  return submitted > 0 ? Math.round((offers / submitted) * 100) : 0;
}

/** Aggregate + rank string occurrences (e.g. missing skills). */
export function tallyTop(values: string[], limit = 10): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v.trim();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}
