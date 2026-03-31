import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { registerSchema } from "../../auth/schemas/auth-schema"
import { provisionOjsUser } from "./ojs-user-service"
import { dispatchEmailEvent } from "@/src/lib/email/event-dispatcher"
import crypto from "crypto"
import { getSsoSecret } from "@/src/features/ojs/server/sso-utils"
import { checkRateLimit } from "@/src/lib/rate-limiter"

/** Registration rate limit: 5 requests per IP per 15 minutes */
const REGISTRATION_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: "reg",
} as const

const app = new Hono()

// POST /ojs/register
// Provision a new user into OJS and redirect to SSO
app.post("/register", zValidator("json", registerSchema), async (c) => {
  try {
    // Rate limiting — extract real IP from proxy headers or fall back to socket
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      || c.req.header("x-real-ip")
      || "unknown"

    const isTest = process.env.NODE_ENV === "test"
    const rateCheck = isTest ? { allowed: true, retryAfterMs: 0 } : checkRateLimit(ip, REGISTRATION_RATE_LIMIT)

    if (!rateCheck.allowed) {
      c.res.headers.set("Retry-After", String(Math.ceil(rateCheck.retryAfterMs / 1000)))
      return c.json({
        success: false,
        error: "Too many registration attempts. Please try again later.",
      }, 429)
    }
    const payload = c.req.valid("json")
    const { email, firstName, lastName } = payload

    // 1. Provision into OJS DB
    const provisionPayload = {
      ...payload,
      journalPath: c.req.query("journalPath") || ""
    }
    const { success: ojsOk, error: ojsError } = await provisionOjsUser(provisionPayload)

    if (!ojsOk) {
      console.error(`[OJS Provisioning Failed] for ${email}:`, ojsError)
      if (ojsError?.toLowerCase().includes("email already exists") || ojsError?.toLowerCase().includes("unique constraint")) {
        return c.json({ success: false, error: "Email already exists" }, 400)
      }
      return c.json({ success: false, error: "OJS Provisioning Failed: " + ojsError }, 500)
    }

    // 2. Generate the SSO Tracking Token (Stateless HMAC)
    const timestamp = Date.now()
    const payloadStr = JSON.stringify({ email, timestamp })
    const payloadBase64 = Buffer.from(payloadStr).toString("base64")
    
    const activeSecret = getSsoSecret()
    const signature = crypto.createHmac("sha256", activeSecret).update(payloadBase64).digest("hex")
    
    const token = `${payloadBase64}.${signature}`

    // 3. Email event (fire-and-forget)
    void dispatchEmailEvent({
      type: "registration_confirmation",
      payload: {
        author_name: `${firstName} ${lastName}`.trim(),
        email,
        journal_title: "DigitoPub",
      }
    })

    // 4. Construct SSO redirect URL
    const ojsBaseUrl = process.env.OJS_BASE_URL || ""
    const ssoReturnDomain = ojsBaseUrl.endsWith("/") ? ojsBaseUrl.slice(0, -1) : ojsBaseUrl
    
    const afterLoginPath = provisionPayload.journalPath ? `/index.php/${provisionPayload.journalPath}/submission` : "/index.php/index/login"
    const ssoUrl = `${ssoReturnDomain}/sso_login.php?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(afterLoginPath)}&source=${encodeURIComponent(afterLoginPath)}`

    console.log(`[OJS_PROVISION] Success for ${email}. Jumping to SSO.`)

    return c.json({
      success: true,
      status: "sso_redirect",
      ssoUrl,
      email,
      message: "Registration successful. Redirecting to journal..."
    }, 201)
  } catch (error) {
    console.error("Registration error:", error)
    return c.json({ success: false, error: "Registration failed" }, 500)
  }
})

export { app as provisionRouter }