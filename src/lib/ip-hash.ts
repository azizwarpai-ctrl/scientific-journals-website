/**
 * Daily-rotating salted SHA-256 hash of IP / User-Agent.
 *
 *   salt = HMAC_SHA256(EVENT_IP_HASH_SALT_SEED, "YYYY-MM-DD" UTC)
 *   hash = SHA-256(salt || input)
 *
 * Same input on different UTC days yields different hashes — the salt rotates
 * at midnight UTC, so cross-day correlation is impossible without the seed.
 */

import { createHash, createHmac } from "node:crypto"
import { getMetricsEnv } from "./env"

/** Return today's UTC date string in `YYYY-MM-DD` format. */
export function dayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Internal helper: salt for a given day. */
function dailySalt(day: string): Buffer {
  const env = getMetricsEnv()
  return createHmac("sha256", env.EVENT_IP_HASH_SALT_SEED).update(day).digest()
}

/** Hash a single value (IP or UA) with the day-rotating salt. Lowercase hex. */
export function hashWithDailySalt(value: string, day: string = dayKey()): string {
  if (!value) return ""
  const salt = dailySalt(day)
  return createHash("sha256").update(salt).update(value).digest("hex")
}

/** Convenience wrapper for an IP. */
export function hashIp(ip: string, day: string = dayKey()): string {
  return hashWithDailySalt(ip, day)
}

/** Convenience wrapper for a User-Agent. */
export function hashUa(ua: string, day: string = dayKey()): string {
  return hashWithDailySalt(ua, day)
}

/** Extract the client IP from common Next.js / Hono request shapes. */
export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  return (
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("x-client-ip") ||
    "0.0.0.0"
  )
}
