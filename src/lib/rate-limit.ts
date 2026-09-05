interface RateLimitOptions {
  /** Sliding window duration in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key within the window. */
  max: number;
}

interface RateLimitResult {
  /** Whether the request is allowed. */
  success: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Seconds until the window resets (only meaningful when blocked). */
  retryAfter: number;
}

/**
 * Lightweight in-memory (per-instance) sliding-window rate limiter.
 * Suitable for protecting API routes from spam/abuse on a single server.
 *
 * Note: state lives in the process memory, so it resets on redeploy and is
 * not shared across multiple instances. For a single-instance deployment this
 * is enough to stop basic spamming; use a shared store (Redis) for multi-node.
 */
export function createRateLimiter({ windowMs, max }: RateLimitOptions) {
  const hits = new Map<string, number[]>();
  let lastSweep = Date.now();

  // Periodically drop stale keys so the map doesn't grow unbounded.
  function sweep(now: number) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    const windowStart = now - windowMs;
    for (const [key, timestamps] of hits) {
      const fresh = timestamps.filter((t) => t > windowStart);
      if (fresh.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, fresh);
      }
    }
  }

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    sweep(now);

    const windowStart = now - windowMs;
    const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= max) {
      const oldest = timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
      hits.set(key, timestamps);
      return { success: false, remaining: 0, retryAfter };
    }

    timestamps.push(now);
    hits.set(key, timestamps);

    return {
      success: true,
      remaining: Math.max(0, max - timestamps.length),
      retryAfter: 0,
    };
  };
}

/**
 * Best-effort extraction of the client IP from a request's forwarding headers.
 * Falls back to a shared bucket when no IP is available.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
