/**
 * Cache abstraction. An in-memory TTL implementation ships now; a Redis-backed
 * implementation can be dropped in later (spec §Search Strategy → Caching)
 * without touching call sites.
 */
export interface Cache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache implements Cache {
  private readonly store = new Map<string, Entry<unknown>>();

  constructor(
    private readonly defaultTtlMs = 5 * 60 * 1000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return Promise.resolve(undefined);
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return Promise.resolve(undefined);
    }
    return Promise.resolve(entry.value as T);
  }

  set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, { value, expiresAt: this.now() + (ttlMs ?? this.defaultTtlMs) });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.store.clear();
    return Promise.resolve();
  }
}
