type Entry<T> = {
  value: T;
  expiresAt: number;
};

export type TtlCache<T> = {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlOverrideMs?: number): void;
};

/**
 * Lightweight in-memory TTL cache with lazy eviction.
 *
 * Lazy eviction means expired entries are removed only when they are next
 * accessed. There is no background timer. This keeps the helper free of
 * lifecycle concerns (no `dispose` call site needed) and is appropriate
 * for this app's small key space.
 *
 * `set()` accepts an optional `ttlOverrideMs` so a single cache instance
 * can hold values with different freshness windows — used by the marine
 * cache to keep `null` (this-location-has-no-coast) for longer than data.
 */
export const createTtlCache = <T>(defaultTtlMs: number): TtlCache<T> => {
  const store = new Map<string, Entry<T>>();

  return {
    get(key) {
      const entry = store.get(key);

      if (!entry) {
        return undefined;
      }

      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }

      return entry.value;
    },

    set(key, value, ttlOverrideMs) {
      const ttl = ttlOverrideMs ?? defaultTtlMs;
      store.set(key, {
        value,
        expiresAt: Date.now() + ttl
      });
    }
  };
};
