/**
 * Lightweight LRU Cache with TTL support.
 * No external dependencies - uses native Map for storage.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheOptions {
  /** Maximum number of entries (default: 100) */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttlMs?: number;
}

/**
 * Simple LRU cache with TTL support.
 * When max size is reached, oldest entries are evicted first.
 */
export class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 100;
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Get a value from cache. Returns undefined if not found or expired.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used) for LRU behavior
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in cache with optional custom TTL.
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Delete existing entry to update position
    this.cache.delete(key);

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
    });
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a specific key from cache.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size (including potentially expired entries).
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get or compute a value. If key exists in cache, return it.
   * Otherwise, compute using the provided function and cache the result.
   */
  async getOrCompute(
    key: string,
    compute: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Synchronous version of getOrCompute.
   */
  getOrComputeSync(
    key: string,
    compute: () => T,
    ttlMs?: number
  ): T {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = compute();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Remove all expired entries from cache.
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }
}

/**
 * Pre-configured cache instances for common use cases.
 */
export const analysisCache = new Cache<unknown>({
  maxSize: 50,
  ttlMs: 5 * 60 * 1000, // 5 minutes
});

export const instrumentCache = new Cache<unknown>({
  maxSize: 1000,
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
});

export const userCache = new Cache<unknown>({
  maxSize: 500,
  ttlMs: 60 * 60 * 1000, // 1 hour
});
