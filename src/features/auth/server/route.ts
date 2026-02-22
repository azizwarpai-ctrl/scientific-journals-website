import { Hono } from "hono"
import { loginSchema, registerSchema } from "../schemas/auth-schema"
import { createUser, verifyPassword, getUserById } from "@/lib/db/users"
import { createSession, getSession, destroySession } from "@/lib/db/auth"

const app = new Hono()

// POST /auth/login
app.post("/login", async (c) => {
  try {
    const body = await c.req.json()
    const validation = loginSchema.safeParse(body)

    if (!validation.success) {
      return c.json(
        { success: false, error: "Validation failed", data: validation.error.issues },
        400
      )
    }

    const { email, password } = validation.data
    const user = await verifyPassword(email, password)

    if (!user) {
      return c.json({ success: false, error: "Invalid email or password" }, 401)
    }

    await createSession(user)

    return c.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
    })
  } catch (error) {
    console.error("Login error:", error)
    return c.json({ success: false, error: "Authentication failed" }, 500)
  }
})

// POST /auth/register
app.post("/register", async (c) => {
  try {
    const body = await c.req.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return c.json(
        { success: false, error: "Validation failed", data: validation.error.issues },
        400
      )
    }

    const { email, password, fullName } = validation.data
    const userId = await createUser(email, password, fullName, "admin")

    const user = {
      id: userId.toString(),
      email,
      full_name: fullName,
      role: "admin",
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
