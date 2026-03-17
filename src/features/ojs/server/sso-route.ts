import { Hono } from "hono"
import { getSession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"
import { ojsQuery, isOjsConfigured } from "./ojs-client"
import { provisionOjsUser } from "@/src/features/ojs/server/ojs-user-service"
import crypto from "crypto"

export const ssoRouter = new Hono()

// GET /api/ojs/sso/redirect
// This route is called when a user clicks "Submit Manuscript".
// It generates a fast token in Next.js and redirects to the OJS submitmanager.com receiver.
ssoRouter.get("/redirect", async (c) => {
    try {
        if (!isOjsConfigured()) {
            return c.json({ error: "OJS integration is not configured" }, 503)
        }

        const ojsBaseUrl = process.env.OJS_BASE_URL
        if (!ojsBaseUrl) {
            return c.json({ error: "OJS_BASE_URL is not configured" }, 500)
        }

        // Optional: journal path for deep-linking to specific journal submission
        const journalPath = c.req.query("journalPath") || ""

        // 1. Verify Next.js authenticated session
        const session = await getSession()
        if (!session) {
            // Unauthenticated? Boot them to Next.js login with a returnUrl to come back here.
            // We use a relative path instead of parsing c.req.url to prevent leaking the internal 0.0.0.0 proxy address
            const returnPath = journalPath
                ? `/api/ojs/sso/redirect?journalPath=${encodeURIComponent(journalPath)}`
                : "/api/ojs/sso/redirect"
            return c.redirect(`/login?returnUrl=${encodeURIComponent(returnPath)}`)
        }

        const email = session.email

        // 2. Ensure the user exists in OJS Database
        // We do a lookup purely by email.
        const existingOjsUser = await ojsQuery<{ user_id: number }>(
            `SELECT user_id FROM users WHERE email = ?`,
            [email]
        )

        // 3. Generate the Next.js SSO Tracking Token
        const token = crypto.randomBytes(32).toString("hex")
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes valid

        await prisma.ojsSsoToken.create({
            data: {
                token,
                email,
                expires_at: expiresAt,
            }
        })

        // 2. Ensure the user exists in OJS Database (Check & Provision)
        // If they do not exist, we auto-provision them directly into the OJS backend over HTTP.
        if (existingOjsUser.length === 0) {
            // We need full details from the Next.js database to provision effectively
            const localUser = await prisma.adminUser.findUnique({
                where: { email }
            })

            if (!localUser) {
                await prisma.ojsSsoToken.delete({ where: { token } })
                return c.json({ error: "Local user record not found for active session" }, 404)
            }

            const fullName = (localUser.full_name || "").trim()
            const nameParts = fullName.split(/\s+/)
            const firstName = nameParts[0] || "User"
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName

            const { success, error } = await provisionOjsUser({
                email: localUser.email,
                firstName,
                lastName,
                country: localUser.country || "US", // Fallback if missing
                affiliation: localUser.affiliation || "Independent",
                biography: localUser.biography || "",
                orcid: localUser.orcid || ""
            })

            if (!success) {
                console.warn("[OJS_SSO] Provisioning returned failure, performing final re-check:", error)
                
                // Final re-check: maybe the user was created by a concurrent request 
                // that we didn't catch via the 409 handler (e.g. if the bridge doesn't support 409 yet)
                const finalCheck = await ojsQuery<{ user_id: number }>(
                    `SELECT user_id FROM users WHERE email = ?`,
                    [email]
                )

                if (finalCheck.length === 0) {
                    console.error("[OJS_SSO] Provisioning failed and user still missing in OJS:", error)
                    await prisma.ojsSsoToken.delete({ where: { token } })
                    return c.json({ error: "Failed to provision OJS synchronization" }, 500)
                }
                
                console.info("[OJS_SSO] User confirmed exists in OJS after provisioning failure fallback.")
            }
        }

        // 5. Issue Redirect Pivot
        // SiteGround must host this small PHP script at the root.
        const ssoReturnDomain = ojsBaseUrl.endsWith("/") ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl
        // Build redirect URL with journal-specific submission path if provided
        const afterLoginPath = journalPath ? `/${journalPath}/submission` : ""
        const redirectUrl = `${ssoReturnDomain}/sso_login.php?token=${token}${afterLoginPath ? `&redirect=${encodeURIComponent(afterLoginPath)}` : ""}`

        return c.redirect(redirectUrl)

    } catch (error: any) {
        console.error("[OJS_SSO_REDIRECT_ERROR]", error)
        return c.json({ error: "Internal SSO provider error" }, 500)
    }
})

// GET /api/ojs/sso/validate
// Called BY the SiteGround sso_login.php script to verify a token and get the user's email.
ssoRouter.get("/validate", async (c) => {
    const token = c.req.query("token")
    if (!token) return c.json({ valid: false, error: "Missing token" }, 400)

    try {
        // Atomic conditional update: set used=true only when the token exists,
        // is not yet consumed, and has not expired. This prevents TOCTOU races.
        const result = await prisma.ojsSsoToken.updateMany({
            where: {
                token,
                used: false,
                expires_at: { gt: new Date() },
            },
            data: { used: true },
        })

        // If no rows were affected, the token is invalid for some reason.
        // Determine why by looking up the token.
        if (result.count === 0) {
            const existingToken = await prisma.ojsSsoToken.findUnique({
                where: { token },
                select: { used: true, expires_at: true },
            })

            if (!existingToken) {
                return c.json({ valid: false, error: "Token not found" }, 404)
            }
            if (existingToken.used) {
                return c.json({ valid: false, error: "Token already consumed" }, 410)
            }
            if (new Date() > existingToken.expires_at) {
                return c.json({ valid: false, error: "Token expired" }, 410)
            }

            // Fallback: should not reach here, but be safe
            return c.json({ valid: false, error: "Token invalid" }, 400)
        }

        // Token was consumed atomically. Now fetch the email.
        const consumedToken = await prisma.ojsSsoToken.findUnique({
            where: { token },
            select: { email: true },
        })

        return c.json({
            valid: true,
            email: consumedToken!.email,
        })

    } catch (error: any) {
        console.error("[OJS_SSO_VALIDATE_ERROR]", error)
        return c.json({ valid: false, error: "Internal validation error" }, 500)
    }
})
