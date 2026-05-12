/**
 * Hono middleware for the public-user identity layer.
 *
 * - `attachIdentity` — reads the cookie, sets `c.set('identity', ...)`,
 *   re-mints the cookie when sliding refresh is needed.
 * - `requireIdentity` — 401 + WWW-Authenticate when no identity is present.
 *
 * Does NOT call getSession() / jwtVerify — that is the admin auth pathway.
 */

import { createMiddleware } from "hono/factory"
import type { Context, Next } from "hono"
import {
  ABSOLUTE_TTL_SECONDS,
  buildSetCookieHeader,
  getIdentity,
  refreshedCookieMaxAge,
  refreshSliding,
  type Identity,
} from "./identity-cookie"

declare module "hono" {
  interface ContextVariableMap {
    identity?: Identity | null
  }
}

export const attachIdentity = createMiddleware(async (c: Context, next: Next) => {
  const identity = await getIdentity(c.req.raw.headers)
  c.set("identity", identity ?? null)

  await next()

  if (identity?.refreshNeeded) {
    // Reload payload from a fresh getIdentity (it preserves iat/exp_absolute).
    const { cookie, newPayload } = refreshSliding({
      orcid: identity.orcid,
      ojs_user_id: identity.ojs_user_id,
      email_hash: identity.email_hash,
      iat: identity.iat,
      exp_sliding: identity.exp_sliding,
      exp_absolute: identity.exp_absolute,
      version: 1,
    })
    const maxAge = Math.min(refreshedCookieMaxAge(newPayload), ABSOLUTE_TTL_SECONDS)
    c.res.headers.append("Set-Cookie", buildSetCookieHeader(cookie, maxAge))
  }
})

export const requireIdentity = createMiddleware(async (c: Context, next: Next) => {
  const identity = await getIdentity(c.req.raw.headers)
  if (!identity) {
    return c.json(
      { success: false, error: "ORCID_REQUIRED", message: "Sign in with ORCID to continue." },
      401,
      { "WWW-Authenticate": 'orcid realm="digitopub", scope="/authenticate"' }
    )
  }
  c.set("identity", identity)
  await next()
})
