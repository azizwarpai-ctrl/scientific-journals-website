/**
 * Centralized runtime env loader for UIET-P1.
 *
 * - Production: missing required vars throw at first read.
 * - Development / test: missing required vars fall back to dev defaults
 *   and emit a console warning.
 *
 * NEVER prefix any of these with NEXT_PUBLIC_ — they all live server-side.
 */

import { z } from "zod"

const isProduction = process.env.NODE_ENV === "production"
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"

const booleanFromString = z
  .union([z.string(), z.boolean(), z.undefined()])
  .transform((v) => {
    if (typeof v === "boolean") return v
    if (typeof v === "string") return v.toLowerCase() === "true"
    return false
  })

const requiredSecret = (name: string) =>
  z
    .string()
    .min(1)
    .optional()
    .transform((v) => {
      if (v && v.length > 0) return v
      if (isProduction && !isBuildPhase) {
        throw new Error(`[env] ${name} is required in production`)
      }
      if (!isBuildPhase) {
        // eslint-disable-next-line no-console
        console.warn(
          `[env] ${name} not set — using insecure dev default. DO NOT ship like this.`
        )
      }
      return `dev-default-${name}-change-me-${name.length}`
    })

const optionalString = z.string().optional().transform((v) => v || null)

const envSchema = z.object({
  /** OAuth client credentials issued by orcid.org/developer-tools */
  ORCID_CLIENT_ID: requiredSecret("ORCID_CLIENT_ID"),
  ORCID_CLIENT_SECRET: requiredSecret("ORCID_CLIENT_SECRET"),
  ORCID_REDIRECT_URI: optionalString,

  /** HMAC secrets — independent values, rotating any one invalidates its cookies */
  IDENTITY_COOKIE_SECRET: requiredSecret("IDENTITY_COOKIE_SECRET"),
  ORCID_STATE_SECRET: requiredSecret("ORCID_STATE_SECRET"),
  EVENT_IP_HASH_SALT_SEED: requiredSecret("EVENT_IP_HASH_SALT_SEED"),

  /** Feature flags */
  ENABLE_ORCID_OJS_BACKFILL: booleanFromString.default(!isProduction),
  UIET_P1_ENABLED: booleanFromString.default(false),
})

export type UietEnv = z.infer<typeof envSchema>

let cached: UietEnv | null = null

/**
 * Read & validate UIET-P1 env vars. Safe to call repeatedly — result cached.
 *
 * Falls back to fail-soft defaults during `NEXT_PHASE=phase-production-build`
 * so that `next build` does not crash when secrets are absent at compile time.
 */
export function getEnv(): UietEnv {
  if (cached) return cached
  const parsed = envSchema.safeParse({
    ORCID_CLIENT_ID: process.env.ORCID_CLIENT_ID,
    ORCID_CLIENT_SECRET: process.env.ORCID_CLIENT_SECRET,
    ORCID_REDIRECT_URI: process.env.ORCID_REDIRECT_URI,
    IDENTITY_COOKIE_SECRET: process.env.IDENTITY_COOKIE_SECRET,
    ORCID_STATE_SECRET: process.env.ORCID_STATE_SECRET,
    EVENT_IP_HASH_SALT_SEED: process.env.EVENT_IP_HASH_SALT_SEED,
    ENABLE_ORCID_OJS_BACKFILL: process.env.ENABLE_ORCID_OJS_BACKFILL,
    UIET_P1_ENABLED: process.env.UIET_P1_ENABLED,
  })
  if (!parsed.success) {
    // Surface the precise failing field — Zod's flatten() format.
    throw new Error(
      `[env] UIET-P1 environment validation failed: ${JSON.stringify(
        parsed.error.flatten()
      )}`
    )
  }
  cached = parsed.data
  return cached
}

/** Derived: the ORCID callback URL, computed from NEXT_PUBLIC_APP_URL when not set explicitly. */
export function getOrcidRedirectUri(): string {
  const env = getEnv()
  if (env.ORCID_REDIRECT_URI) return env.ORCID_REDIRECT_URI
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"
  return `${appUrl}/api/auth/orcid/callback`
}

/** Reset cache — TEST ONLY. */
export function __resetEnvCacheForTests() {
  cached = null
}
