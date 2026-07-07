export interface RetryOptions {
  retries?: number;
  /** Base delay in ms; grows exponentially with each attempt. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Return false to stop retrying a given error (e.g. a 4xx). */
  shouldRetry?: (error: unknown) => boolean;
  /** Injectable sleep — overridden in tests to avoid real timers. */
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (error: unknown, attempt: number) => void;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `fn` with exponential backoff. Retries transient failures (search /
 * AI / network calls) up to `retries` times, then rethrows the last error.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 250;
  const maxDelayMs = options.maxDelayMs ?? 5_000;
  const shouldRetry = options.shouldRetry ?? (() => true);
  const sleep = options.sleep ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) break;
      options.onRetry?.(error, attempt + 1);
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(delay);
    }
  }
  throw lastError;
}
