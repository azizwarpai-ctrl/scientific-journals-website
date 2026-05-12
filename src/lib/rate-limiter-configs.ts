/**
 * UIET-P1 named rate-limit configurations.
 *
 * Composed on top of the existing in-memory sliding-window limiter
 * in src/lib/rate-limiter.ts. Two windows can be combined to enforce both
 * per-minute and per-hour caps.
 */

import { checkRateLimit, type RateLimitResult } from "./rate-limiter"
import { clientIpFromHeaders } from "./ip-hash"

export const METRICS_PER_MIN = { maxRequests: 60, windowMs: 60 * 1000, keyPrefix: "metrics:1m" }
export const METRICS_PER_HOUR = { maxRequests: 600, windowMs: 60 * 60 * 1000, keyPrefix: "metrics:1h" }
export const ORCID_CALLBACK_PER_MIN = {
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: "orcid:cb:1m",
}

export interface MultiLimitResult extends RateLimitResult {
  /** Which window tripped first; null when allowed. */
  triggered: string | null
}

export function enforceMetricsRateLimit(headers: Headers): MultiLimitResult {
  const ip = clientIpFromHeaders(headers)
  const perMin = checkRateLimit(ip, METRICS_PER_MIN)
  if (!perMin.allowed) return { ...perMin, triggered: "minute" }
  const perHour = checkRateLimit(ip, METRICS_PER_HOUR)
  if (!perHour.allowed) return { ...perHour, triggered: "hour" }
  return { ...perMin, triggered: null }
}

export function enforceOrcidCallbackRateLimit(headers: Headers): MultiLimitResult {
  const ip = clientIpFromHeaders(headers)
  const res = checkRateLimit(ip, ORCID_CALLBACK_PER_MIN)
  return { ...res, triggered: res.allowed ? null : "minute" }
}
