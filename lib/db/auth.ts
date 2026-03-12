import { cookies } from "next/headers"
import { prisma } from "./config"
import * as jose from "jose"

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  
  const isProduction = process.env.NODE_ENV === "production";
  const isServer = typeof window === "undefined";
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  if (!secret) {
    if (isProduction && isServer && !isBuildPhase) {
       throw new Error("JWT_SECRET is required in production");
    }
    
    if (isProduction) {
       console.warn("Warning: JWT_SECRET is missing during build or startup. Session functionality will fail.");
    }

    return new TextEncoder().encode("default-development-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJwtSecret()

export interface User {
  id: string
  email: string
  full_name: string
  role: string
}

export async function createSession(user: User) {
  const token = await new jose.SignJWT({
    userId: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
  })
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
      full_name: (payload.full_name as string) || "",
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

  return user?.role === "admin" || user?.role === "superadmin"
}
