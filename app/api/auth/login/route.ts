import { type NextRequest, NextResponse } from "next/server"
import { verifyPassword } from "@/lib/db/users"
import { createSession } from "@/lib/db/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await verifyPassword(email, password)

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    await createSession(user)

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
