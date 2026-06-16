/**
 * digitopub_identity cookie — public-user identity (ORCID-derived).
 *
 * Format: base64url(payload).base64url(HMAC_SHA256(payload, IDENTITY_COOKIE_SECRET))
 *
 * - sliding 30 min, absolute 8 h
 * - ±2 min clock skew tolerance (A1)
 * - revocation-aware via revoked_orcids table
 * - SIBLING to admin auth_token; never invokes getSession()/jwtVerify
 */

import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { getIdentityEnv } from "./env"
import { prisma } from "./db/config"

export const IDENTITY_COOKIE_NAME = "digitopub_identity"
export const COOKIE_PATH = "/"
export const SLIDING_TTL_SECONDS = 30 * 60
export const ABSOLUTE_TTL_SECONDS = 8 * 60 * 60
export const SKEW_TOLERANCE_SECONDS = 120
export const SLIDING_REFRESH_WINDOW_SECONDS = 5 * 60

const REVOCATION_CACHE_TTL_MS = 60 * 1000

const payloadSchema = z.object({
  orcid: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/),
  ojs_user_id: z.number().int().nullable(),
  email_hash: z.string().length(64).nullable(),
  iat: z.number().int().positive(),
  exp_sliding: z.number().int().positive(),
  exp_absolute: z.number().int().positive(),
  version: z.literal(1),
})

export type IdentityPayload = z.infer<typeof payloadSchema>

export interface IdentityCookieResult {
  payload: IdentityPayload
  refreshNeeded: boolean
}

export interface MintInput {
  orcid: string
  ojs_user_id: number | null
  email_hash: string | null
  /** Override the issued-at time (default: now). Useful for tests. */
  now?: number
}

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4)
  return Buffer.from(padded, "base64")
}

function sign(payloadB64: string, secret: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(payloadB64).digest())
}

/** Mint a fresh identity cookie value. */
export function mintCookie(input: MintInput): string {
  const env = getIdentityEnv()
  const now = input.now ?? Math.floor(Date.now() / 1000)
  const payload: IdentityPayload = {
    orcid: input.orcid,
    ojs_user_id: input.ojs_user_id,
    email_hash: input.email_hash,
    iat: now,
    exp_sliding: now + SLIDING_TTL_SECONDS,
    exp_absolute: now + ABSOLUTE_TTL_SECONDS,
    version: 1,
  }
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const sig = sign(payloadB64, env.IDENTITY_COOKIE_SECRET)
  return `${payloadB64}.${sig}`
}

/** Mint with explicit payload (used by sliding refresh — keeps original iat & exp_absolute). */
export function mintCookieFromPayload(payload: IdentityPayload): string {
  const env = getIdentityEnv()
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const sig = sign(payloadB64, env.IDENTITY_COOKIE_SECRET)
  return `${payloadB64}.${sig}`
}

/** Verify the cookie value. Returns null on any failure. */
export function verifyCookie(value: string, nowSeconds?: number): IdentityCookieResult | null {
  const env = getIdentityEnv()
  if (!value || typeof value !== "string") return null
  const parts = value.split(".")
  if (parts.length !== 2) return null

  const [payloadB64, sig] = parts
  const expectedSig = sign(payloadB64, env.IDENTITY_COOKIE_SECRET)

  // timingSafeEqual rejects mismatched lengths; guard before calling.
  if (sig.length !== expectedSig.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null
  } catch {
    return null
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"))
  } catch {
    return null
  }
  const parsed = payloadSchema.safeParse(parsedJson)
  if (!parsed.success) return null
  const payload = parsed.data

  const now = nowSeconds ?? Math.floor(Date.now() / 1000)
  if (now > payload.exp_absolute + SKEW_TOLERANCE_SECONDS) return null
  if (now > payload.exp_sliding + SKEW_TOLERANCE_SECONDS) return null

  const refreshNeeded =
    now > payload.exp_sliding - SLIDING_REFRESH_WINDOW_SECONDS &&
    now + SLIDING_TTL_SECONDS < payload.exp_absolute

  return { payload, refreshNeeded }
}

interface RevocationCacheEntry {
  cookieIatMin: number | null
  expiresAt: number
}
const revocationCache = new Map<string, RevocationCacheEntry>()

/** Returns true if the cookie was issued before the revocation cutoff for this ORCID. */
export async function isRevoked(orcid: string, iat: number): Promise<boolean> {
  const now = Date.now()
  const cached = revocationCache.get(orcid)
  if (cached && cached.expiresAt > now) {
    return cached.cookieIatMin !== null && iat < cached.cookieIatMin
  }
  const row = await prisma.revokedOrcid.findUnique({ where: { orcid } })
  const cookieIatMin = row?.cookie_iat_min ?? null
  revocationCache.set(orcid, { cookieIatMin, expiresAt: now + REVOCATION_CACHE_TTL_MS })
  return cookieIatMin !== null && iat < cookieIatMin
}

/** Invalidate the revocation cache entry for one ORCID. Call after marking it revoked. */
export function invalidateRevocationCache(orcid: string): void {
  revocationCache.delete(orcid)
}

/** Reset the entire revocation cache. TEST ONLY. */
export function __resetRevocationCacheForTests(): void {
  revocationCache.clear()
}

export interface Identity {
  orcid: string
  ojs_user_id: number | null
  email_hash: string | null
  iat: number
  exp_sliding: number
  exp_absolute: number
  refreshNeeded: boolean
}

/** Read the cookie from a Request or Headers. Returns null when missing/invalid/revoked. */
export async function getIdentity(req: Request | Headers): Promise<Identity | null> {
  const headers = req instanceof Headers ? req : req.headers
  const cookieHeader = headers.get("cookie")
  if (!cookieHeader) return null

  const cookieValue = parseCookieHeader(cookieHeader, IDENTITY_COOKIE_NAME)
  if (!cookieValue) return null

  const result = verifyCookie(cookieValue)
  if (!result) return null

  if (await isRevoked(result.payload.orcid, result.payload.iat)) return null

  return {
    orcid: result.payload.orcid,
    ojs_user_id: result.payload.ojs_user_id,
    email_hash: result.payload.email_hash,
    iat: result.payload.iat,
    exp_sliding: result.payload.exp_sliding,
    exp_absolute: result.payload.exp_absolute,
    refreshNeeded: result.refreshNeeded,
  }
}

function parseCookieHeader(header: string, name: string): string | null {
  const parts = header.split(/;\s*/)
  for (const p of parts) {
    const eq = p.indexOf("=")
    if (eq < 0) continue
    if (p.slice(0, eq) === name) {
      const raw = p.slice(eq + 1)
      try {
        return decodeURIComponent(raw)
      } catch {
        return raw
      }
    }
  }
  return null
}

/** Build a Set-Cookie value for the identity cookie. Host-only on digitopub.com. */
export function buildSetCookieHeader(value: string, maxAgeSeconds: number): string {
  return [
    `${IDENTITY_COOKIE_NAME}=${encodeURIComponent(value)}`,
    `Path=${COOKIE_PATH}`,
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ")
}

/** Build a Set-Cookie value that clears the identity cookie. */
export function buildClearCookieHeader(): string {
  return [
    `${IDENTITY_COOKIE_NAME}=`,
    `Path=${COOKIE_PATH}`,
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ")
}

/** Compute when to set Max-Age — the lesser of (now → exp_absolute) and (now → 8h). */
export function refreshedCookieMaxAge(payload: IdentityPayload, nowSeconds?: number): number {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000)
  return Math.max(0, payload.exp_absolute - now)
}

/** Re-mint a cookie with sliding refreshed (used by middleware on near-expiry). */
export function refreshSliding(payload: IdentityPayload, nowSeconds?: number): {
  cookie: string
  newPayload: IdentityPayload
} {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000)
  const newPayload: IdentityPayload = {
    ...payload,
    exp_sliding: Math.min(now + SLIDING_TTL_SECONDS, payload.exp_absolute),
  }
  return { cookie: mintCookieFromPayload(newPayload), newPayload }
}
