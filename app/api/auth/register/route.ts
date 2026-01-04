import { type NextRequest, NextResponse } from "next/server"
import { createUser } from "@/lib/db/users"
import { createSession } from "@/lib/db/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json()

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const userId = await createUser(email, password, fullName, "admin")

    const user = {
      id: userId,
      email,
      full_name: fullName,
      role: "admin",
    }

    await createSession(user)

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, role: user.role } })
  } catch (error: any) {
    console.error("Registration error:", error)
    if (error.code === "23505") {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
