import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { getOtpDeliveryMethod, generateOTPCode } from "@/src/features/auth/utils/auth-utils.server"
import { loginSchema, registerSchema } from "../schemas/auth-schema"
import { createUser, verifyPassword, getUserById } from "@/src/lib/db/users"
import { createSession, getSession, destroySession } from "@/src/lib/db/auth"
import { provisionOjsUser } from "@/src/features/ojs/server/ojs-user-service"
import { dispatchEmailEvent } from "@/src/lib/email/event-dispatcher"
import { prisma } from "@/src/lib/db/config"
import crypto from "crypto"

const app = new Hono()

// POST /auth/login
app.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json")
    const user = await verifyPassword(email, password)

    if (!user) {
      return c.json({ success: false, error: "Invalid email or password" }, 401)
    }

    // Check delivery method
    const deliveryMethod = getOtpDeliveryMethod()

    if (deliveryMethod === 'disabled') {
      return c.json({
        success: false,
        error: "OTP delivery is currently disabled for security. Please contact the administrator."
      }, 503)
    }

    // Generate OTP code
    const code = generateOTPCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Invalidate any existing codes for this user
    await prisma.verificationCode.updateMany({
      where: { email: user.email, used: false },
      data: { used: true },
    })

    // Hash the code before storing
    const hashedCode = await bcrypt.hash(code, 10)

    // Store the new verification code
    await prisma.verificationCode.create({
      data: {
        user_id: BigInt(user.id),
        email: user.email,
        code: hashedCode,
        expires_at: expiresAt,
      },
    })

    if (deliveryMethod === 'console') {
      // Log ONLY in development/console mode (showing only masked/no code)
      console.log(`[OTP] Verification generated for ${user.email}`)
    } else {
      console.log(`[OTP] Verification generated for ${user.email} (Email delivery enabled but not yet implemented)`)
    }

    return c.json({
      success: true,
      requiresVerification: true,
      email: user.email,
      message: deliveryMethod === 'console'
        ? "Verification code generated in server console."
        : "Email delivery not yet implemented. Please check server logs.",
    })
  } catch (error) {
    console.error("Login error:", error)
    return c.json({ success: false, error: "Authentication failed" }, 500)
  }
})

// POST /auth/verify-code
const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

app.post("/verify-code", zValidator("json", verifyCodeSchema), async (c) => {
  try {
    const { email, code } = c.req.valid("json")

    // Find the latest active verification code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    }) as any

    if (!verificationCode) {
      return c.json({ success: false, error: "Invalid or expired verification code" }, 401)
    }

    // Check if locked
    if (verificationCode.locked_until && new Date() < verificationCode.locked_until) {
      return c.json({ success: false, error: "Invalid or expired verification code" }, 401)
    }

    // Constant time comparison would be better but bcrypt handle its own comparison
    const isCodeValid = await bcrypt.compare(code, verificationCode.code)

    if (!isCodeValid) {
      // Increment attempts
      const newAttempts = (verificationCode.attempts || 0) + 1

      // Escalating lockout policy
      let lockoutMinutes = 0
      if (newAttempts >= 15) {
        lockoutMinutes = 24 * 60 // 24 hours
      } else if (newAttempts >= 10) {
        lockoutMinutes = 60 // 1 hour
      } else if (newAttempts >= 5) {
        lockoutMinutes = 15 // 15 minutes
      }

      const lockoutTime = lockoutMinutes > 0 ? new Date(Date.now() + lockoutMinutes * 60 * 1000) : null

      await prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: {
          attempts: newAttempts,
          last_failed_at: new Date(),
          locked_until: lockoutTime,
        } as any,
      })

      return c.json({ success: false, error: "Invalid or expired verification code" }, 401)
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    })

    // Fetch the user and create a full session
    const user = await prisma.adminUser.findUnique({
      where: { email },
    })

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404)
    }

    await createSession({
      id: user.id.toString(),
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    })

    return c.json({
      success: true,
      user: { id: user.id.toString(), email: user.email, role: user.role },
    })
  } catch (error) {
    console.error("Verification error:", error)
    return c.json({ success: false, error: "Verification failed" }, 500)
  }
})

// POST /auth/resend-code
const resendCodeSchema = z.object({
  email: z.string().email(),
})

app.post("/resend-code", zValidator("json", resendCodeSchema), async (c) => {
  try {
    const { email } = c.req.valid("json")

    // Verify user exists
    const user = await prisma.adminUser.findUnique({ where: { email } })
    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404)
    }

    // Check delivery method
    const deliveryMethod = getOtpDeliveryMethod()

    if (deliveryMethod === 'disabled') {
      return c.json({ success: false, error: "OTP delivery is disabled." }, 503)
    }

    // Invalidate existing codes
    await prisma.verificationCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    })

    // Generate new code
    const code = generateOTPCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    const hashedCode = await bcrypt.hash(code, 10)

    await prisma.verificationCode.create({
      data: {
        user_id: user.id,
        email: user.email,
        code: hashedCode,
        expires_at: expiresAt,
      },
    })

    if (deliveryMethod === 'console') {
      console.log(`[OTP] Resent verification for ${user.email}`)
    } else {
      console.log(`[OTP] Resent verification generated for ${user.email} (Email delivery enabled but not yet implemented)`)
    }

    return c.json({
      success: true,
      message: deliveryMethod === 'console'
        ? "New verification code generated in server console."
        : "Email delivery not yet implemented.",
    })
  } catch (error) {
    console.error("Resend code error:", error)
    return c.json({ success: false, error: "Failed to resend code" }, 500)
  }
})

// POST /auth/register
app.post("/register", zValidator("json", registerSchema), async (c) => {
  try {
    const payload = c.req.valid("json")
    const { email, firstName, lastName } = payload

    // 1. Provision into OJS DB (Blocking: If this fails, registration fails. OJS is the source of truth.)
    const { success: ojsOk, error: ojsError } = await provisionOjsUser(payload)

    if (!ojsOk) {
      console.error(`[OJS Provisioning Failed] for ${email}:`, ojsError)
      return c.json({ success: false, error: "OJS Provisioning Failed: " + ojsError }, 500)
    }

    // 2. Generate the SSO Tracking Token (Stateless HMAC) to login immediately
    const timestamp = Date.now()
    const payloadStr = JSON.stringify({ email, timestamp })
    const payloadBase64 = Buffer.from(payloadStr).toString("base64")
    
    const secret = process.env.SSO_SECRET
    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("CRITICAL: SSO_SECRET missing in production!")
        }
        console.warn("[WARNING] Missing SSO_SECRET; using local fallback.")
    }
    const activeSecret = secret || "default_development_sso_secret"
    const signature = crypto.createHmac("sha256", activeSecret).update(payloadBase64).digest("hex")
    
    const token = `${payloadBase64}.${signature}`

    // 3. Fire registration confirmation email (fire-and-forget)
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
    
    // We can infer the selected journal path if they provided one, but if not we go to generic OJS root
    // To properly support journal paths during registration, we need the frontend to optionally supply selectedJournalPath
    const journalPath = c.req.query("journalPath") || "" 
    const afterLoginPath = journalPath ? `/${journalPath}/submission` : ""
    const ssoUrl = `${ssoReturnDomain}/sso_login.php?token=${token}${afterLoginPath ? `&redirect=${encodeURIComponent(afterLoginPath)}` : ""}`

    console.log(`[AUTH] Registration routed to gateway success for ${email}. Jumping to SSO.`)

    return c.json({
      success: true,
      status: "sso_redirect",
      ssoUrl,
      email,
      message: "Registration successful. Redirecting to journal..."
    }, 201)
  } catch (error: any) {
    console.error("Registration error:", error)
    // Prisma P2002 = unique constraint, MySQL ER_DUP_ENTRY = 1062, PostgreSQL = 23505
    if (error.code === "P2002" || error.code === "23505" || error.code === "ER_DUP_ENTRY" || error.message?.includes("Unique constraint")) {
      return c.json({ success: false, error: "Email already exists" }, 400)
    }
    return c.json({ success: false, error: "Registration failed" }, 500)
  }
})

// POST /auth/logout
app.post("/logout", async (c) => {
  try {
    await destroySession()
    return c.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    return c.json({ success: false, error: "Logout failed" }, 500)
  }
})

// GET /auth/me
app.get("/me", async (c) => {
  try {
    const session = await getSession()

    if (!session) {
      return c.json({ success: false, error: "Not authenticated" }, 401)
    }

    const user = await getUserById(session.id)

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404)
    }

    return c.json({ success: true, user })
  } catch (error) {
    console.error("Failed to get user:", error)
    return c.json({ success: false, error: "Failed to get user" }, 500)
  }
})

export { app as authRouter }
