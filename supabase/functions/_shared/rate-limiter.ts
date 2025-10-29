// Edge Function rate limiter with Upstash Redis support
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN secrets for production

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per window

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit using Upstash Redis (if configured) or in-memory fallback
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const upstashUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const upstashToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  // Use Upstash if configured
  if (upstashUrl && upstashToken) {
    return checkRateLimitUpstash(key, upstashUrl, upstashToken);
  }

  // Fallback to in-memory (per-edge-instance; fine for dev)
  return checkRateLimitMemory(key);
}

async function checkRateLimitUpstash(
  key: string,
  url: string,
  token: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucketKey = `ratelimit:${key}:${Math.floor(now / WINDOW_MS)}`;

  try {
    // Use Redis INCR + EXPIRE for atomic rate limiting
    const response = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', bucketKey],
        ['EXPIRE', bucketKey, String(Math.ceil(WINDOW_MS / 1000)), 'NX'],
      ]),
    });

    const results = (await response.json()) as Array<{ result: number }>;
    const count = results[0]?.result ?? 0;
    const remaining = Math.max(0, MAX_REQUESTS - count);
    const resetAt = now + (WINDOW_MS - (now % WINDOW_MS));

    return {
      allowed: count <= MAX_REQUESTS,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('[RateLimit] Upstash error, falling back to memory:', error);
    return checkRateLimitMemory(key);
  }
}

function checkRateLimitMemory(key: string): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  // Clean up expired entries
  if (entry && entry.resetAt < now) {
    memoryStore.delete(key);
  }

  // No entry or expired
  if (!entry || entry.resetAt < now) {
    const resetAt = now + WINDOW_MS;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetAt,
    };
  }

  // Entry exists and not expired
  if (entry.count < MAX_REQUESTS) {
    entry.count++;
    return {
      allowed: true,
      remaining: MAX_REQUESTS - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit key from request
 * Prioritizes user ID over IP
 */
export function getRateLimitKey(
  userId: string | null,
  ip: string | null
): string {
  if (userId) return `user:${userId}`;
  if (ip) return `ip:${ip}`;
  return 'anonymous';
}

/**
 * Get client IP from request
 */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || null;
}
