import { Hono } from "hono"
import crypto from "crypto"

export const ssoRouter = new Hono()

// POST /api/ojs/sso
// Stateless Single Sign-On bridging pivot
ssoRouter.post("/", async (c) => {
    try {
        const body = await c.req.parseBody()
        const email = body.email as string
        const journalPath = body.journalPath as string || ""
        
        if (!email) {
            return c.json({ error: "Missing identity context" }, 400)
        }

        // Stateless token generation (HMAC signature)
        const timestamp = Date.now()
        const payloadStr = JSON.stringify({ email, timestamp })
        const payloadBase64 = Buffer.from(payloadStr).toString("base64")
        
        const secret = process.env.SSO_SECRET || "default_development_sso_secret"
        const signature = crypto.createHmac("sha256", secret).update(payloadBase64).digest("hex")
        
        const token = `${payloadBase64}.${signature}`
        
        const ojsBaseUrl = process.env.OJS_BASE_URL || "https://submitmanager.com"
        const ssoReturnDomain = ojsBaseUrl.endsWith("/") ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl
        
        const afterLoginPath = journalPath ? `/${journalPath}/submission` : ""
        const redirectUrl = `${ssoReturnDomain}/sso_login.php?token=${token}${afterLoginPath ? `&redirect=${encodeURIComponent(afterLoginPath)}` : ""}`
        
        return c.redirect(redirectUrl)
    } catch (err: any) {
        console.error("[OJS_SSO_POST_ERROR]", err)
        return c.json({ error: "Internal SSO provider error" }, 500)
    }
})

// GET /api/ojs/sso/validate
// Called BY the SiteGround sso_login.php script to verify a stateless token and get the user's email.
ssoRouter.get("/validate", async (c) => {
    const token = c.req.query("token")
    if (!token) return c.json({ valid: false, error: "Missing token" }, 400)
    
    try {
        const parts = token.split(".")
        if (parts.length !== 2) {
            return c.json({ valid: false, error: "Invalid token format" }, 400)
        }
        
        const [payloadBase64, signature] = parts
        
        const secret = process.env.SSO_SECRET || "default_development_sso_secret"
        const expectedSignature = crypto.createHmac("sha256", secret).update(payloadBase64).digest("hex")
        
        if (signature !== expectedSignature) {
            return c.json({ valid: false, error: "Invalid signature" }, 401)
        }
        
        const decodedStr = Buffer.from(payloadBase64, "base64").toString("utf8")
        const decoded = JSON.parse(decodedStr)
        
        const { email, timestamp } = decoded
        
        // 5 minute expiration window
        if (Date.now() - timestamp > 5 * 60 * 1000) {
            return c.json({ valid: false, error: "Token expired" }, 410)
        }
        
        return c.json({
            valid: true,
            email,
        })
    } catch (err: any) {
        console.error("[OJS_SSO_VALIDATE_ERROR]", err)
        return c.json({ valid: false, error: "Validation failed" }, 500)
    }
})
