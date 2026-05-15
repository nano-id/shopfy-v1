/**
 * In-memory rate limiting for single-instance dev/beta.
 * TODO(production): Replace bucket store with Redis for multi-instance deployments.
 */

export type RateLimitOptions = {
  max: number;
  windowMs: number;
};

export type RateLimitResult = {
  limited: boolean;
  remaining: number;
  resetAt: number;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function buildRateLimitKey(namespace: string, ...parts: string[]): string {
  return `${namespace}:${parts.map((p) => p.trim().toLowerCase()).join(":")}`;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      limited: false,
      remaining: Math.max(0, options.max - 1),
      resetAt,
    };
  }

  entry.count += 1;
  const limited = entry.count > options.max;
  return {
    limited,
    remaining: Math.max(0, options.max - entry.count),
    resetAt: entry.resetAt,
  };
}

/** @internal — test helper only */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}
