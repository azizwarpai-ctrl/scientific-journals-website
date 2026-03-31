/**
 * In-memory IP-based rate limiter.
 * Suitable for single-instance deployments (e.g., Hostinger).
 * For multi-instance, swap to Redis-backed implementation.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent memory leaks (run every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

let cleanupTimer: ReturnType<typeof setInterval> | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
  // Allow process to exit cleanly
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref()
  }
}

startCleanup()

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Key prefix to namespace different limiters */
  keyPrefix?: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter: number
}

/**
 * Check if a request from the given IP is allowed under the rate limit.
 * Returns an object with the result and metadata for response headers.
 */
export function checkRateLimit(ip: string, config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowMs, keyPrefix = "rl" } = config
  const key = `${keyPrefix}:${ip}`
  const now = Date.now()

  const entry = store.get(key)

  // No existing entry or window expired — allow and create new entry
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
      retryAfter: 0,
    }
  }

  // Window still active
  if (entry.count < maxRequests) {
    entry.count++
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt,
      retryAfter: 0,
    }
  }

  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetAt: entry.resetAt,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  }
}
