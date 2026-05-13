import { cookies } from "next/headers"
import * as jose from "jose"

const MIN_SECRET_BYTES = 32

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

  const encoded = secret ? new TextEncoder().encode(secret) : null;

  if (isProduction) {
    if (!encoded) {
      if (!isBuildPhase) {
        throw new Error("JWT_SECRET is required in production");
      }
      console.warn(
        "Warning: JWT_SECRET is not set during build phase. Session functionality will fail at runtime."
      );
      return new TextEncoder().encode("default-development-secret-change-me");
    }
    if (encoded.length < MIN_SECRET_BYTES) {
      if (!isBuildPhase) {
        throw new Error(`JWT_SECRET must be at least ${MIN_SECRET_BYTES} bytes in production`);
      }
      console.warn(
        `Warning: JWT_SECRET is too short during build phase (${encoded.length} < ${MIN_SECRET_BYTES} bytes). Session functionality will fail at runtime.`
      );
      return encoded;
    }
    return encoded;
  }

  if (encoded) return encoded;

  console.warn(
    "Warning: JWT_SECRET is not set — using insecure development default. Do not use this in production."
  );
  return new TextEncoder().encode("default-development-secret-change-me");
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
