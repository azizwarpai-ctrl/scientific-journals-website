import { Hono } from "hono"
import crypto from "crypto"

export const ssoRouter = new Hono()

import { getSsoSecret } from "@/src/features/ojs/server/sso-utils"

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
        let decoded: Record<string, unknown>
        try {
            decoded = JSON.parse(decodedStr)
        } catch {
            console.error("invalid SSO payload: malformed JSON", decodedStr)
            return c.json({ valid: false, error: "Malformed payload" }, 400)
        }
        
        const { email, timestamp } = decoded
        
        // 5 minute expiration window
        if (Date.now() - (timestamp as number) > 5 * 60 * 1000) {
            return c.json({ valid: false, error: "Token expired" }, 410)
        }
        
        return c.json({
            valid: true,
            email,
        })
    } catch (err) {
        console.error("[OJS_SSO_VALIDATE_ERROR]", err)
        return c.json({ valid: false, error: "Validation failed" }, 500)
    }
})
