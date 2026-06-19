/**
 * One-time HMAC-signed OAuth state token, persisted via the
 * `digitopub_oauth_state` cookie. Mint at /api/auth/orcid/start,
 * verify-and-consume at /api/auth/orcid/callback.
 *
 * Reuse-detection: an in-memory LRU keyed on nonce. Cookies are also cleared
 * by the callback so a replayed state must come from outside the browser.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { getOrcidEnv } from "./env"

export const STATE_COOKIE_NAME = "digitopub_oauth_state"
export const STATE_COOKIE_PATH = "/api/auth/orcid"
export const STATE_TTL_SECONDS = 10 * 60

const REUSE_LRU_MAX = 4096
const REUSE_LRU_TTL_MS = STATE_TTL_SECONDS * 1000

const consumedNonces = new Map<string, number>()

function recordConsumed(nonce: string): void {
  if (consumedNonces.size >= REUSE_LRU_MAX) {
    // Drop oldest entry (Maps preserve insertion order).
    const first = consumedNonces.keys().next().value
    if (first) consumedNonces.delete(first)
  }
  consumedNonces.set(nonce, Date.now() + REUSE_LRU_TTL_MS)
}

function isConsumed(nonce: string): boolean {
  const exp = consumedNonces.get(nonce)
  if (!exp) return false
  if (Date.now() > exp) {
    consumedNonces.delete(nonce)
    return false
  }
  return true
}

const payloadSchema = z.object({
  nonce: z.string().min(16),
  exp: z.number().int().positive(),
  return_url: z.string(),
})

export type StatePayload = z.infer<typeof payloadSchema>

export class StateReusedError extends Error {
  constructor() {
    super("STATE_REUSED")
    this.name = "StateReusedError"
  }
}
export class StateExpiredError extends Error {
  constructor() {
    super("STATE_EXPIRED")
    this.name = "StateExpiredError"
  }
}
export class StateInvalidError extends Error {
  constructor() {
    super("INVALID_STATE")
    this.name = "StateInvalidError"
  }
}

function b64u(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
function b64uDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)
  return Buffer.from(padded, "base64")
}
function sign(payloadB64: string, secret: string): string {
  return b64u(createHmac("sha256", secret).update(payloadB64).digest())
}

export interface MintStateInput {
  return_url: string
  now?: number
}

/** Mint a fresh state token. Returns the token string and the nonce inside it. */
export function mintState(input: MintStateInput): { token: string; nonce: string } {
  const env = getOrcidEnv()
  const now = input.now ?? Math.floor(Date.now() / 1000)
  const nonce = b64u(randomBytes(24))
  const payload: StatePayload = {
    nonce,
    exp: now + STATE_TTL_SECONDS,
    return_url: input.return_url,
  }
  const payloadB64 = b64u(JSON.stringify(payload))
  const sig = sign(payloadB64, env.ORCID_STATE_SECRET)
  return { token: `${payloadB64}.${sig}`, nonce }
}

/**
 * Verify the token, ensure it has not been consumed, and mark it consumed.
 * Throws StateInvalidError / StateExpiredError / StateReusedError on failure.
 */
export function verifyAndConsumeState(token: string, nowSeconds?: number): StatePayload {
  const env = getOrcidEnv()
  if (!token || typeof token !== "string") throw new StateInvalidError()
  const parts = token.split(".")
  if (parts.length !== 2) throw new StateInvalidError()
  const [payloadB64, sig] = parts
  const expected = sign(payloadB64, env.ORCID_STATE_SECRET)
  if (sig.length !== expected.length) throw new StateInvalidError()
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      throw new StateInvalidError()
    }
  } catch {
    throw new StateInvalidError()
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(b64uDecode(payloadB64).toString("utf8"))
  } catch {
    throw new StateInvalidError()
  }
  const parsed = payloadSchema.safeParse(parsedJson)
  if (!parsed.success) throw new StateInvalidError()
  const payload = parsed.data

  const now = nowSeconds ?? Math.floor(Date.now() / 1000)
  if (now > payload.exp) throw new StateExpiredError()

  if (isConsumed(payload.nonce)) throw new StateReusedError()
  recordConsumed(payload.nonce)

  return payload
}

export function buildSetStateCookieHeader(token: string): string {
  return [
    `${STATE_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=${STATE_COOKIE_PATH}`,
    `Max-Age=${STATE_TTL_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ")
}

export function buildClearStateCookieHeader(): string {
  return [
    `${STATE_COOKIE_NAME}=`,
    `Path=${STATE_COOKIE_PATH}`,
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ")
}

/** TEST ONLY: wipe the consumed-nonce LRU. */
export function __resetConsumedNoncesForTests(): void {
  consumedNonces.clear()
}
