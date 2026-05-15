import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW = "15 m";

// Lazily constructed so missing env vars only error if actually called in production.
let _ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (_ratelimit) return _ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, WINDOW),
    analytics: false,
  });
  return _ratelimit;
}

// In-memory fallback for local dev / test environments without Upstash.
interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

function memoryCheck(key: string, max: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (entry.count >= max) {
    return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const rl = getRatelimit();
  if (!rl) return memoryCheck(key, maxRequests);

  const { success, reset } = await rl.limit(key);
  const retryAfterSeconds = success ? 0 : Math.ceil((reset - Date.now()) / 1000);
  return { ok: success, retryAfterSeconds };
}
