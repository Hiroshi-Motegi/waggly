import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter with Upstash Redis for distributed environments (Vercel Serverless).
 * Falls back to in-memory when UPSTASH_REDIS_REST_URL is not configured.
 */

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: false,
  });
  return ratelimit;
}

// In-memory fallback for development / when Upstash is not configured
const store = new Map<string, { count: number; resetAt: number }>();

// Upstash未設定時のみインメモリストアのクリーンアップを実行
if (!process.env.UPSTASH_REDIS_REST_URL) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of store) {
      if (val.resetAt < now) store.delete(key);
    }
  }, 60_000);
}

function checkRateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const rl = getRatelimit();
  if (rl) {
    const result = await rl.limit(key);
    return { allowed: result.success, remaining: result.remaining };
  }
  return checkRateLimitInMemory(key, limit, windowMs);
}

/** Extract client IP from request headers.
 * x-real-ip を優先（Vercel が設定、クライアント偽装不可）。
 * x-forwarded-for は最後の値を使用（最も信頼できるプロキシが追加した値）。
 */
export function getClientIP(req: Request): string {
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map(s => s.trim());
    return ips[ips.length - 1];
  }
  return "unknown";
}
