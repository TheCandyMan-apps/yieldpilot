// Simple in-memory rate limiter for edge functions
// For production, consider Redis or Upstash

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (IP or user ID)
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or expired
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  // Entry exists and not expired
  if (entry.count < config.maxRequests) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
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
