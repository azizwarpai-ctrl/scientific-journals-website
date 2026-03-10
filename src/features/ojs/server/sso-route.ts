import { Hono } from "hono"
import { getSession } from "@/lib/db/auth"
import { prisma } from "@/lib/db/config"
import { ojsQuery, isOjsConfigured } from "./ojs-client"
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

        // 1. Verify Next.js authenticated session
        const session = await getSession()
        if (!session) {
            // Unauthenticated? Boot them to Next.js login with a returnUrl to come back here.
            const loginUrl = new URL(c.req.url)
            loginUrl.pathname = "/login"
            loginUrl.searchParams.set("returnUrl", "/api/ojs/sso/redirect")
            return c.redirect(loginUrl.toString())
        }

        const email = session.email

        // 2. Ensure the user exists in OJS Database
        // We do a lookup purely by email.
        const existingOjsUser = await ojsQuery<{ user_id: number }>(
            `SELECT user_id FROM users WHERE email = ?`,
            [email]
        )

        // If they do not exist, we auto-provision them directly into the OJS MySQL backend.
        // For OJS 3.x, users require basic fields. 
        // Note: Password generation is complex in OJS (SHA1 with salt), but we don't care because they use SSO.
        // We use a dummy impossible hash to technically fulfill the non-null requirement.
        if (existingOjsUser.length === 0) {
            const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + crypto.randomBytes(4).toString("hex")
            const dummyPassword = crypto.randomUUID()
            
            await ojsQuery(
                `INSERT INTO users (username, password, email, disabled, inline_help, date_registered, date_last_login) 
                 VALUES (?, ?, ?, 0, 1, NOW(), NOW())`,
                [username, dummyPassword, email]
            )

            // Typically OJS users need to be associated with a user_group (like 'Author') 
            // We'll leave that to the OJS PHP receiver script or assume OJS defaults for now.
        }

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

        // 4. Issue Redirect Pivot
        // SiteGround must host this small PHP script at the root.
        const ssoReturnDomain = ojsBaseUrl.endsWith("/") ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl
        const redirectUrl = `${ssoReturnDomain}/sso_login.php?token=${token}`

        return c.redirect(redirectUrl)

    } catch (error: any) {
        console.error("[OJS_SSO_REDIRECT_ERROR]", error)
        return c.json({ error: "Internal SSO provider error", details: error.message }, 500)
    }
})

// GET /api/ojs/sso/validate
// Called BY the SiteGround sso_login.php script to verify a token and get the user's email.
ssoRouter.get("/validate", async (c) => {
    const token = c.req.query("token")
    if (!token) return c.json({ valid: false, error: "Missing token" }, 400)

    try {
        const ssoToken = await prisma.ojsSsoToken.findUnique({
            where: { token }
        })

        if (!ssoToken) {
            return c.json({ valid: false, error: "Token not found" })
        }

        if (ssoToken.used) {
            return c.json({ valid: false, error: "Token already consumed" })
        }

        if (new Date() > ssoToken.expires_at) {
            return c.json({ valid: false, error: "Token expired" })
        }

        // Consume the one-time token
        await prisma.ojsSsoToken.update({
            where: { token },
            data: { used: true }
        })

        return c.json({
            valid: true,
            email: ssoToken.email
        })

    } catch (error: any) {
        console.error("[OJS_SSO_VALIDATE_ERROR]", error)
        return c.json({ valid: false, error: "Internal validation error" }, 500)
    }
})
