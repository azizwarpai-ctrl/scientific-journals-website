import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { getOtpDeliveryMethod, generateOTPCode } from "@/src/features/auth/utils/auth-utils.server"
import { loginSchema, registerSchema } from "../schemas/auth-schema"
import { createUser, verifyPassword, getUserById } from "@/src/lib/db/users"
import { createSession, getSession, destroySession } from "@/src/lib/db/auth"
import { prisma } from "@/src/lib/db/config"

/** Extended type for verification codes that includes custom lockout fields */
interface VerificationCodeRecord {
  id: bigint
  user_id: bigint
  email: string
  code: string
  used: boolean
  expires_at: Date
  created_at: Date
  attempts: number | null
  locked_until: Date | null
  last_failed_at: Date | null
}

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
    }) as VerificationCodeRecord | null

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
        },
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
