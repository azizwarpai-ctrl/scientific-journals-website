import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/db/auth"
import { getUserById } from "@/lib/db/users"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const user = await getUserById(session.id)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Failed to get user:", error)
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 })
  }
}
