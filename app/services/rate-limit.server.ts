/** In-memory rate limit placeholder — replace with Redis in production. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  options: { max: number; windowMs: number },
): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return false;
  }

  entry.count += 1;
  if (entry.count > options.max) {
    return true;
  }
  return false;
}
