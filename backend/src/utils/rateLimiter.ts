/**
 * Minimal async rate limiter that spaces calls at least `minIntervalMs` apart.
 * Each provider gets its own instance so we stay polite to every source
 * independently (spec §Search Strategy → Rate Limiting).
 */
export class RateLimiter {
  private nextAvailable = 0;

  constructor(
    private readonly minIntervalMs: number,
    // Injectable clock/sleep for deterministic tests.
    private readonly now: () => number = () => Date.now(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {}

  /** Resolves once the caller is allowed to proceed. */
  async acquire(): Promise<void> {
    const current = this.now();
    const wait = Math.max(0, this.nextAvailable - current);
    // Reserve this slot before awaiting so concurrent callers queue in order.
    this.nextAvailable = Math.max(current, this.nextAvailable) + this.minIntervalMs;
    if (wait > 0) await this.sleep(wait);
  }
}
