/**
 * `digitopub_consent` cookie — GDPR / ePrivacy consent state.
 *
 * NOT httpOnly (the banner is a client component and needs to read it).
 * SameSite=Lax, host-only on digitopub.com, 1-year expiry.
 *
 * Pre-consent grace (O-6 / FR-037): 30 dismissals or 30 days, whichever comes
 * first. After that, the banner becomes modal and forces a choice.
 */

import { z } from "zod"

export const CONSENT_COOKIE_NAME = "digitopub_consent"
export const CONSENT_COOKIE_PATH = "/"
export const CONSENT_TTL_SECONDS = 365 * 24 * 60 * 60
export const FORCE_CHOICE_DISMISS_THRESHOLD = 31

const ChoiceEnum = z.enum(["all", "essential_only", "customize"])
export type ConsentChoice = z.infer<typeof ChoiceEnum>

const granularSchema = z
  .object({
    analytics: z.boolean(),
    personalization: z.boolean(),
  })
  .strict()
export type ConsentGranular = z.infer<typeof granularSchema>

const payloadSchema = z.object({
  choice: ChoiceEnum.nullable(),
  granular: granularSchema.nullable(),
  dismiss_count: z.number().int().nonnegative(),
  first_dismiss_at: z.number().int().positive().nullable(),
  decided_at: z.number().int().positive().nullable(),
  version: z.literal(1),
})

export type ConsentPayload = z.infer<typeof payloadSchema>

function b64u(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
function b64uDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)
  return Buffer.from(padded, "base64")
}

function encodePayload(payload: ConsentPayload): string {
  return b64u(JSON.stringify(payload))
}

function parseCookieHeader(header: string, name: string): string | null {
  for (const p of header.split(/;\s*/)) {
    const eq = p.indexOf("=")
    if (eq < 0) continue
    if (p.slice(0, eq) === name) {
      try {
        return decodeURIComponent(p.slice(eq + 1))
      } catch {
        return p.slice(eq + 1)
      }
    }
  }
  return null
}

/** Read consent from a Request/Headers. Returns null if cookie absent or malformed. */
export function getConsent(req: Request | Headers): ConsentPayload | null {
  const headers = req instanceof Headers ? req : req.headers
  const cookieHeader = headers.get("cookie")
  if (!cookieHeader) return null

  const raw = parseCookieHeader(cookieHeader, CONSENT_COOKIE_NAME)
  if (!raw) return null

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(b64uDecode(raw).toString("utf8"))
  } catch {
    return null
  }
  const parsed = payloadSchema.safeParse(parsedJson)
  if (!parsed.success) return null
  return parsed.data
}

export interface SetConsentInput {
  choice: ConsentChoice
  granular?: ConsentGranular
  now?: number
  /** Preserve a prior dismiss count if available. */
  prevDismissCount?: number
}

export function buildSetConsentCookieHeader(input: SetConsentInput): string {
  const now = input.now ?? Math.floor(Date.now() / 1000)
  const payload: ConsentPayload = {
    choice: input.choice,
    granular: input.granular ?? null,
    dismiss_count: input.prevDismissCount ?? 0,
    first_dismiss_at: null,
    decided_at: now,
    version: 1,
  }
  return [
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(encodePayload(payload))}`,
    `Path=${CONSENT_COOKIE_PATH}`,
    `Max-Age=${CONSENT_TTL_SECONDS}`,
    "Secure",
    "SameSite=Lax",
  ].join("; ")
}

export interface RecordDismissInput {
  prev: ConsentPayload | null
  now?: number
}

export function buildRecordDismissCookieHeader(input: RecordDismissInput): string {
  const now = input.now ?? Math.floor(Date.now() / 1000)
  const prev = input.prev
  const dismissCount = (prev?.dismiss_count ?? 0) + 1
  const firstDismissAt = prev?.first_dismiss_at ?? now
  const payload: ConsentPayload = {
    choice: prev?.choice ?? null,
    granular: prev?.granular ?? null,
    dismiss_count: dismissCount,
    first_dismiss_at: firstDismissAt,
    decided_at: prev?.decided_at ?? null,
    version: 1,
  }
  return [
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(encodePayload(payload))}`,
    `Path=${CONSENT_COOKIE_PATH}`,
    `Max-Age=${CONSENT_TTL_SECONDS}`,
    "Secure",
    "SameSite=Lax",
  ].join("; ")
}

/** True when the banner should be modal-locked (no dismiss option). */
export function shouldForceChoice(payload: ConsentPayload | null): boolean {
  if (!payload || payload.choice) return false
  return payload.dismiss_count >= FORCE_CHOICE_DISMISS_THRESHOLD
}

export type ConsentEffectiveMode =
  | "all"            // include ip_hash + ua_hash
  | "essential_only" // skip ip_hash + ua_hash
  | "pre_consent"    // skip ip_hash + ua_hash AND skip orcid attribution

/**
 * Derive how event-recorder should behave given the user's current consent.
 * Pre-consent visitors (no choice yet) write fully anonymous rows.
 */
export function effectiveConsentMode(payload: ConsentPayload | null): ConsentEffectiveMode {
  if (!payload || !payload.choice) return "pre_consent"
  if (payload.choice === "all") return "all"
  // "essential_only" and "customize" both default to essentials; customize
  // honors `granular.analytics` to upgrade to "all" semantics.
  if (payload.choice === "customize" && payload.granular?.analytics) return "all"
  return "essential_only"
}
