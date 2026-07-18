/**
 * In-flight request deduplication keyed by idempotency key.
 *
 * When the same key is used concurrently, callers share one Promise.
 * Completed entries are removed so subsequent calls execute normally
 * (SATIM server-side uniqueness on orderNumber remains the source of truth).
 */
export class IdempotencyGuard {
  private readonly inflight = new Map<string, Promise<unknown>>();

  /**
   * Run `fn` once per key while in flight. Concurrent callers with the same
   * key receive the same Promise.
   */
  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing !== undefined) {
      return existing as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.inflight.delete(key);
    });

    this.inflight.set(key, promise);
    return promise;
  }

  /** Number of currently in-flight keyed operations (for tests). */
  get size(): number {
    return this.inflight.size;
  }

  /** Clear all in-flight entries (for tests). */
  clear(): void {
    this.inflight.clear();
  }
}
