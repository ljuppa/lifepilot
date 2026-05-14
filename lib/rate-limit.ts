// In-memory rate limiter — demo fallback when Upstash Redis is not configured.
// Not suitable for multi-instance production; use @upstash/ratelimit in prod.

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string, maxRequests: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}
