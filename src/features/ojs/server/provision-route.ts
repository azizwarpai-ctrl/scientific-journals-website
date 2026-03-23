import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { registerSchema } from "../../auth/schemas/auth-schema"
import { provisionOjsUser } from "./ojs-user-service"
import { dispatchEmailEvent } from "@/src/lib/email/event-dispatcher"
import crypto from "crypto"
import { getSsoSecret } from "@/src/features/ojs/server/sso-utils"

const app = new Hono()

// POST /ojs/register
// Provision a new user into OJS and redirect to SSO
app.post("/register", zValidator("json", registerSchema), async (c) => {
  try {
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
    
    const journalPath = c.req.query("journalPath") || "" 
    const afterLoginPath = journalPath ? `/index.php/${journalPath}/submission` : ""
    const ssoUrl = `${ssoReturnDomain}/sso_login.php?token=${encodeURIComponent(token)}${afterLoginPath ? `&redirect=${encodeURIComponent(afterLoginPath)}` : ""}`

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
