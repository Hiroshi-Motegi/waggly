const store = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for a given key (typically IP address).
 * Returns true if the request is allowed, false if rate-limited.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 3,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
