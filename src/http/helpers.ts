/**
 * Encode a plain object as application/x-www-form-urlencoded.
 * Only own enumerable string keys with primitive values are included.
 */
export function encodeFormBody(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') continue;
    search.append(key, String(value));
  }
  return search.toString();
}

/**
 * Sleep helper for retry backoff.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Generate a short opaque request id for log correlation.
 */
export function createRequestId(): string {
  return `satim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
