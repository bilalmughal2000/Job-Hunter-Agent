/**
 * Text normalization + similarity helpers used by the Deduplication Agent.
 * Kept dependency-free and pure so they are trivially unit-testable.
 */

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize a URL for comparison: drop protocol, `www.`, query, hash, trailing slash. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function tokenSet(input: string): Set<string> {
  return new Set(normalizeText(input).split(' ').filter(Boolean));
}

/** Jaccard similarity of the word sets of two strings, in [0, 1]. */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection++;
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Stable dedup fingerprint for a job — also persisted as `Job.dedupHash`.
 * Kept as a standalone pure function so both the Deduplication Agent and the
 * seed script produce identical hashes (no logic drift).
 */
export function jobFingerprint(company: string, title: string, location: string): string {
  return [normalizeText(company), normalizeText(title), normalizeText(location)].join('::');
}

/**
 * True when two locations plausibly refer to the same place: equal after
 * normalization, or one is contained in the other (e.g. "Lahore" vs
 * "Lahore, Pakistan"), or they share the same leading city token.
 */
export function locationsOverlap(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return na === nb;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const cityA = na.split(' ')[0];
  const cityB = nb.split(' ')[0];
  return cityA !== undefined && cityA === cityB;
}
