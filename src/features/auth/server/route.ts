import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { loginSchema, registerSchema } from "../schemas/auth-schema"
import { createUser, verifyPassword, getUserById } from "@/lib/db/users"
import { createSession, getSession, destroySession } from "@/lib/db/auth"
import { prisma } from "@/lib/db/config"

const app = new Hono()

// Helper: Generate a 6-digit OTP code
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST /auth/login
app.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json")
    const user = await verifyPassword(email, password)

    if (!user) {
      return c.json({ success: false, error: "Invalid email or password" }, 401)
    }

    // Generate OTP code
    const code = generateOTPCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

    // Invalidate any existing codes for this user
    await prisma.verificationCode.updateMany({
      where: { email: user.email, used: false },
      data: { used: true },
    })

    // Store the new verification code
    await prisma.verificationCode.create({
      data: {
        user_id: BigInt(user.id),
        email: user.email,
        code,
        expires_at: expiresAt,
      },
    })

    // Log OTP to server console (replace with email service in production)
    console.log(`[OTP] Verification code for ${user.email}: ${code}`)

    return c.json({
      success: true,
      requiresVerification: true,
      email: user.email,
      message: "Verification code sent. Please check your email.",
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

    // Find the matching verification code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        email,
        code,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    })

    if (!verificationCode) {
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

    // Invalidate existing codes
    await prisma.verificationCode.updateMany({
      where: { email, used: false },
      data: { used: true },
    })

    // Generate new code
    const code = generateOTPCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await prisma.verificationCode.create({
      data: {
        user_id: user.id,
        email: user.email,
        code,
        expires_at: expiresAt,
      },
    })

    console.log(`[OTP] Resent verification code for ${user.email}: ${code}`)

    return c.json({
      success: true,
      message: "New verification code sent.",
    })
  } catch (error) {
    console.error("Resend code error:", error)
    return c.json({ success: false, error: "Failed to resend code" }, 500)
  }
})

// POST /auth/register
app.post("/register", zValidator("json", registerSchema), async (c) => {
  try {
    const { email, password, fullName } = c.req.valid("json")
    const userId = await createUser(email, password, fullName, "author")

    const user = {
      id: userId.toString(),
      email,
      full_name: fullName,
      role: "author",
    }

    await createSession(user)

    return c.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    if (error.code === "23505" || error.message?.includes("Unique constraint")) {
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
