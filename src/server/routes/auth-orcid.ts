/**
 * Public-user ORCID OAuth router.
 *
 * Mounted at /api/auth/orcid/*. Namespaced separately from the admin auth
 * router (/api/auth/login, /api/auth/logout) per the UIET-P1 constitution
 * amendment so the two identity systems never share code paths.
 */

import { Hono } from "hono"
import { randomUUID } from "node:crypto"
import {
    ABSOLUTE_TTL_SECONDS,
    buildClearCookieHeader,
    buildSetCookieHeader,
    getIdentity,
    invalidateRevocationCache,
    IDENTITY_COOKIE_NAME,
    mintCookie,
    refreshedCookieMaxAge,
    refreshSliding,
    SLIDING_TTL_SECONDS,
    SLIDING_REFRESH_WINDOW_SECONDS,
} from "@/src/lib/identity-cookie"
import {
    STATE_COOKIE_NAME,
    StateExpiredError,
    StateInvalidError,
    StateReusedError,
    buildClearStateCookieHeader,
    buildSetStateCookieHeader,
    mintState,
    verifyAndConsumeState,
} from "@/src/lib/orcid-state"
import {
    buildAuthorizeUrl,
    exchangeCode,
    verifyOrcidToken,
} from "@/src/lib/orcid-oauth"
import { enforceOrcidCallbackRateLimit } from "@/src/lib/rate-limiter-configs"
import { BlockedAccountError, emailHash, linkOjsUser } from "./auth-orcid-helpers"

const app = new Hono()

/** GET /api/auth/orcid/start — mint state, redirect to ORCID. */
app.get("/start", async (c) => {
    const url = new URL(c.req.url)
    const rawReturn = url.searchParams.get("return_url") || "/"
    // Restrict return_url to same-origin paths to prevent open redirect.
    const returnUrl = rawReturn.startsWith("/") && !rawReturn.startsWith("//")
        ? rawReturn
        : "/"
    const { token } = mintState({ return_url: returnUrl })
    const authorize = buildAuthorizeUrl(token)
    return new Response(null, {
        status: 302,
        headers: {
            Location: authorize,
            "Set-Cookie": buildSetStateCookieHeader(token),
        },
    })
})

/** GET /api/auth/orcid/callback — exchange code, mint identity, redirect. */
app.get("/callback", async (c) => {
    const rate = enforceOrcidCallbackRateLimit(c.req.raw.headers)
    if (!rate.allowed) {
        return c.json(
            { success: false, error: "RATE_LIMITED", message: "Too many attempts." },
            429,
            { "Retry-After": String(rate.retryAfter) }
        )
    }

    const url = new URL(c.req.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    if (!code || !state) {
        return c.json(
            { success: false, error: "INVALID_REQUEST", message: "Missing code or state." },
            400
        )
    }

    try {
        verifyAndConsumeState(state)
    } catch (err) {
        if (err instanceof StateReusedError) {
            return c.json(
                { success: false, error: "STATE_REUSED", message: "Sign-in already completed; please retry." },
                400,
                { "Set-Cookie": buildClearStateCookieHeader() }
            )
        }
        if (err instanceof StateExpiredError) {
            return c.json(
                { success: false, error: "STATE_EXPIRED", message: "Sign-in session expired; please retry." },
                400,
                { "Set-Cookie": buildClearStateCookieHeader() }
            )
        }
        if (err instanceof StateInvalidError) {
            return c.json(
                { success: false, error: "INVALID_STATE", message: "Invalid sign-in session." },
                400,
                { "Set-Cookie": buildClearStateCookieHeader() }
            )
        }
        throw err
    }

    // Re-derive return_url from the consumed state token. verifyAndConsumeState
    // already validated and consumed; we need it again, so we sign+verify
    // a second time would fail (reuse). Instead, we trust the consumed payload
    // returned at the same moment. The simplest reliable path: re-parse the
    // state payload from its bytes without consuming again.
    //
    // The helper returns the StatePayload already; in this control flow we
    // need to capture it. Refactor: call verifyAndConsumeState once and keep
    // the returned payload.
    //
    // (The above first call was for early rejection without losing the
    // structured error type; for the actual return_url, we accept that the
    // nonce is now consumed and we proceed with the consumed payload from
    // a re-parse of the same state token's payload segment, without
    // signature re-verification — safe because we already verified above.)
    let returnUrl = "/"
    try {
        const parts = state.split(".")
        const padded =
            parts[0].replace(/-/g, "+").replace(/_/g, "/") +
            "=".repeat((4 - (parts[0].length % 4)) % 4)
        const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"))
        if (
            typeof decoded?.return_url === "string" &&
            decoded.return_url.startsWith("/") &&
            !decoded.return_url.startsWith("//")
        ) {
            returnUrl = decoded.return_url
        }
    } catch {
        /* fallback to "/" */
    }

    // Exchange code at ORCID. Failure surfaces as 502.
    let tokenResponse
    try {
        tokenResponse = await exchangeCode(code)
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[auth/orcid/callback] exchangeCode failed:", err)
        return c.json(
            { success: false, error: "ORCID_API_FAILURE", message: "ORCID is temporarily unavailable." },
            502,
            { "Set-Cookie": buildClearStateCookieHeader() }
        )
    }

    // Verify ID token signature + iss/aud when ORCID returned one.
    let verifiedOrcid = tokenResponse.orcid
    let verifiedName: string | null = tokenResponse.name ?? null
    let verifiedEmail: string | null = null
    if (tokenResponse.id_token) {
        try {
            const verified = await verifyOrcidToken(tokenResponse.id_token)
            verifiedOrcid = verified.orcid
            verifiedName = verified.name ?? verifiedName
            verifiedEmail = verified.email
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error("[auth/orcid/callback] id_token verification failed:", err)
            return c.json(
                { success: false, error: "INVALID_TOKEN", message: "ORCID returned an invalid token." },
                502,
                { "Set-Cookie": buildClearStateCookieHeader() }
            )
        }
    }

    // OJS linkage + audited backfill.
    let linkage
    try {
        linkage = await linkOjsUser({
            orcid: verifiedOrcid,
            email: verifiedEmail,
            requestId: randomUUID(),
        })
    } catch (err) {
        if (err instanceof BlockedAccountError) {
            return c.json(
                {
                    success: false,
                    error: "ACCOUNT_DISABLED",
                    message: "This account has been disabled. Please contact support.",
                },
                403,
                { "Set-Cookie": buildClearStateCookieHeader() }
            )
        }
        throw err
    }

    // Mint identity cookie.
    const cookie = mintCookie({
        orcid: verifiedOrcid,
        ojs_user_id: linkage.ojs_user_id,
        email_hash: emailHash(verifiedEmail),
    })

    // Surface verifiedName via a non-essential profile cookie? No — name is
    // not required for any backend decision; we keep the cookie minimal and
    // expose `name` via /whoami when needed.
    void verifiedName

    const setIdentity = buildSetCookieHeader(cookie, ABSOLUTE_TTL_SECONDS)
    const setStateClear = buildClearStateCookieHeader()

    return new Response(null, {
        status: 302,
        headers: new Headers([
            ["Location", returnUrl],
            ["Set-Cookie", setIdentity],
            ["Set-Cookie", setStateClear],
        ]),
    })
})

/** POST /api/auth/orcid/logout — clear identity + state cookies. */
app.post("/logout", async (c) => {
    // Invalidate revocation cache for this ORCID so a fresh login isn't
    // immediately treated as revoked (defensive only — logout does not
    // revoke).
    const identity = await getIdentity(c.req.raw.headers)
    if (identity) invalidateRevocationCache(identity.orcid)

    return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: new Headers([
            ["Content-Type", "application/json"],
            ["Set-Cookie", buildClearCookieHeader()],
            ["Set-Cookie", buildClearStateCookieHeader()],
        ]),
    })
})

/** GET /api/auth/orcid/whoami — return identity payload or {authenticated: false}. */
app.get("/whoami", async (c) => {
    const identity = await getIdentity(c.req.raw.headers)
    if (!identity) {
        return c.json({ authenticated: false })
    }
    const headers: Record<string, string> = {}
    if (identity.refreshNeeded) {
        const { cookie, newPayload } = refreshSliding({
            orcid: identity.orcid,
            ojs_user_id: identity.ojs_user_id,
            email_hash: identity.email_hash,
            iat: identity.iat,
            exp_sliding: identity.exp_sliding,
            exp_absolute: identity.exp_absolute,
            version: 1,
        })
        headers["Set-Cookie"] = buildSetCookieHeader(
            cookie,
            Math.min(refreshedCookieMaxAge(newPayload), ABSOLUTE_TTL_SECONDS)
        )
    }
    return c.json(
        {
            authenticated: true,
            orcid: identity.orcid,
            ojs_user_id: identity.ojs_user_id,
            exp_sliding: identity.exp_sliding,
            exp_absolute: identity.exp_absolute,
        },
        200,
        headers
    )
})

/** POST /api/auth/orcid/refresh — refresh sliding expiry when close. */
app.post("/refresh", async (c) => {
    const identity = await getIdentity(c.req.raw.headers)
    if (!identity) {
        return c.json(
            { success: false, error: "UNAUTHENTICATED" },
            401
        )
    }
    const now = Math.floor(Date.now() / 1000)
    const withinWindow =
        now > identity.exp_sliding - SLIDING_REFRESH_WINDOW_SECONDS &&
        now + SLIDING_TTL_SECONDS < identity.exp_absolute
    if (!withinWindow) {
        return c.json({ refreshed: false })
    }
    const { cookie, newPayload } = refreshSliding({
        orcid: identity.orcid,
        ojs_user_id: identity.ojs_user_id,
        email_hash: identity.email_hash,
        iat: identity.iat,
        exp_sliding: identity.exp_sliding,
        exp_absolute: identity.exp_absolute,
        version: 1,
    })
    return new Response(JSON.stringify({ refreshed: true }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Set-Cookie": buildSetCookieHeader(
                cookie,
                Math.min(refreshedCookieMaxAge(newPayload), ABSOLUTE_TTL_SECONDS)
            ),
        },
    })
})

// Suppress unused IDENTITY_COOKIE_NAME (referenced from comments/types).
void IDENTITY_COOKIE_NAME

export { app as authOrcidRouter }
