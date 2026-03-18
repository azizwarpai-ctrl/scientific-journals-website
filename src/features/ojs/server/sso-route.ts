import { Hono } from "hono"
import crypto from "crypto"

export const ssoRouter = new Hono()

// Helper to pull the SSO secret or fail-fast in Production
const getSsoSecret = () => {
    const s = process.env.SSO_SECRET
    if (!s) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("CRITICAL: SSO_SECRET missing in production!")
        }
        console.warn("[WARNING] Missing SSO_SECRET; using local fallback.")
        return "default_development_sso_secret"
    }
    return s
}

// POST /api/ojs/sso
// Stateless Single Sign-On bridging pivot
ssoRouter.post("/", async (c) => {
    try {
        const contentType = c.req.header("content-type") || ""
        if (!contentType.includes("application/json")) {
            return c.json({ error: "Unsupported Media Type: expected JSON" }, 415)
        }

        const body = await c.req.json()
        const email = body.email as string
        const journalPath = body.journalPath as string || ""
        
        if (!email) {
            return c.json({ error: "Missing identity context" }, 400)
        }

        // Stateless token generation (HMAC signature)
        const timestamp = Date.now()
        const payloadStr = JSON.stringify({ email, timestamp })
        const payloadBase64 = Buffer.from(payloadStr).toString("base64")
        
        const activeSecret = getSsoSecret()
        const signature = crypto.createHmac("sha256", activeSecret).update(payloadBase64).digest("hex")
        
        const token = `${payloadBase64}.${signature}`
        
        const ojsBaseUrl = process.env.OJS_BASE_URL || ""
        const ssoReturnDomain = ojsBaseUrl.endsWith("/") ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl
        
        const afterLoginPath = journalPath ? `/${journalPath}/submission` : ""
        const redirectUrl = `${ssoReturnDomain}/sso_login.php?token=${token}${afterLoginPath ? `&redirect=${encodeURIComponent(afterLoginPath)}` : ""}`
        
        return c.json({ ssoUrl: redirectUrl })
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
        
        const activeSecret = getSsoSecret()
        const expectedSignature = crypto.createHmac("sha256", activeSecret).update(payloadBase64).digest("hex")
        
        const sigBuf = Buffer.from(signature, "hex")
        const expBuf = Buffer.from(expectedSignature, "hex")
        
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return c.json({ valid: false, error: "Invalid signature" }, 401)
        }
        
        const decodedStr = Buffer.from(payloadBase64, "base64").toString("utf8")
        let decoded: any
        try {
            decoded = JSON.parse(decodedStr)
        } catch (e) {
            console.error("invalid SSO payload: malformed JSON", decodedStr)
            return c.json({ valid: false, error: "Malformed payload" }, 400)
        }
        
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
