/**
 * ORCID OAuth helpers: authorize URL, code exchange, ID token verification.
 *
 * - JWKS cache: 24 h with 1 h stale-while-revalidate (A2).
 * - ±2 min skew tolerance on the ID token `exp` and `iat` claims (A1).
 * - Strictly asserts `iss === 'https://orcid.org'` and `aud === ORCID_CLIENT_ID`.
 */

import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type FlattenedJWSInput,
  type JWSHeaderParameters,
} from "jose"
import { getOrcidEnv, getOrcidRedirectUri } from "./env"

export const ORCID_ISSUER = "https://orcid.org"
export const ORCID_AUTHORIZE_URL = "https://orcid.org/oauth/authorize"
export const ORCID_TOKEN_URL = "https://orcid.org/oauth/token"
export const ORCID_JWKS_URL = "https://orcid.org/oauth/jwks"

const JWKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const JWKS_SWR_MS = 60 * 60 * 1000

export interface OrcidTokenResponse {
  access_token: string
  token_type: string
  refresh_token?: string
  expires_in: number
  scope?: string
  name?: string | null
  orcid: string
  id_token?: string
}

interface JwksCacheEntry {
  jwks: ReturnType<typeof createRemoteJWKSet>
  fetchedAt: number
}
let jwksCache: JwksCacheEntry | null = null

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  const now = Date.now()
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.jwks
  }
  // SWR: if cache is stale within the SWR window, return the old set and
  // rebuild for next caller. Otherwise rebuild synchronously.
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS + JWKS_SWR_MS) {
    // jose's remote JWKS already handles its own internal caching;
    // we recreate the set so the next call refreshes from the network.
    const next = createRemoteJWKSet(new URL(ORCID_JWKS_URL))
    jwksCache = { jwks: next, fetchedAt: now }
    return jwksCache.jwks
  }
  jwksCache = {
    jwks: createRemoteJWKSet(new URL(ORCID_JWKS_URL)),
    fetchedAt: now,
  }
  return jwksCache.jwks
}

export function buildAuthorizeUrl(state: string): string {
  const env = getOrcidEnv()
  const u = new URL(ORCID_AUTHORIZE_URL)
  u.searchParams.set("response_type", "code")
  u.searchParams.set("client_id", env.ORCID_CLIENT_ID)
  u.searchParams.set("scope", "/authenticate")
  u.searchParams.set("redirect_uri", getOrcidRedirectUri())
  u.searchParams.set("state", state)
  return u.toString()
}

/**
 * Exchange the OAuth code for an access token + orcid id + (optional) id_token.
 * Throws on non-2xx ORCID responses.
 */
export async function exchangeCode(code: string): Promise<OrcidTokenResponse> {
  const env = getOrcidEnv()
  const body = new URLSearchParams({
    client_id: env.ORCID_CLIENT_ID,
    client_secret: env.ORCID_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: getOrcidRedirectUri(),
  })
  const res = await fetch(ORCID_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>")
    throw new Error(`ORCID token exchange failed: ${res.status} ${text.slice(0, 256)}`)
  }
  const json = (await res.json()) as Partial<OrcidTokenResponse>
  if (!json.access_token || !json.orcid) {
    throw new Error("ORCID token response missing required fields")
  }
  return json as OrcidTokenResponse
}

export interface VerifiedOrcidToken {
  orcid: string
  name: string | null
  email: string | null
  payload: JWTPayload
}

/**
 * Verify an ORCID-issued ID token against ORCID's JWKS.
 *
 * Returns the verified ORCID iD (from `sub`) plus best-effort name/email.
 * Throws on any verification failure.
 */
export async function verifyOrcidToken(idToken: string): Promise<VerifiedOrcidToken> {
  const env = getOrcidEnv()
  const jwks = getJwks()
  const { payload } = await jwtVerify(idToken, jwks as never, {
    issuer: ORCID_ISSUER,
    audience: env.ORCID_CLIENT_ID,
    clockTolerance: 120,
  })
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("ORCID ID token missing sub claim")
  }
  const orcid = payload.sub
  const name = (payload["name"] as string | undefined) ?? null
  const email = (payload["email"] as string | undefined) ?? null
  return { orcid, name, email, payload }
}

/**
 * Convenience for test environments: replace the JWKS resolver entirely.
 * Pass null to revert. NOT for production use.
 */
export function __overrideJwksForTests(
  resolver:
    | ((header: JWSHeaderParameters, token: FlattenedJWSInput) => Promise<CryptoKey>)
    | null
): void {
  if (resolver === null) {
    jwksCache = null
    return
  }
  jwksCache = {
    jwks: resolver as unknown as ReturnType<typeof createRemoteJWKSet>,
    fetchedAt: Date.now(),
  }
}
