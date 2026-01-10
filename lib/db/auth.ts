import { cookies } from "next/headers"
import { prisma } from "./config"
import * as jose from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export interface User {
  id: string
  email: string
  full_name: string
  role: string
}

export async function createSession(user: User) {
  const token = await new jose.SignJWT({ userId: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })

  return token
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value

  if (!token) {
    return null
  }

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET)
    return {
      id: payload.userId as string,
      email: payload.email as string,
      full_name: "", // Will be fetched from DB if needed
      role: payload.role as string,
    }
  } catch (error) {
    console.error("JWT verification failed:", error)
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete("auth_token")
}

export async function verifyAdmin(userId: string): Promise<boolean> {
  const user = await prisma.adminUser.findUnique({
    where: { id: BigInt(userId) },
    select: { role: true },
  })
  
  return user?.role === "admin"
}
