import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isPublicRoute, isAdminRoute } from "@/config/routes"
import * as jose from "jose"

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required")
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get("auth_token")?.value

  // Special case: Login page with valid token -> redirect to dashboard
  if (pathname === "/admin/login" && token) {
    try {
      await jose.jwtVerify(token, JWT_SECRET)
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    } catch {
      // Token invalid, let it proceed to login page
    }
  }

  // Public routes - allow access
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Admin routes - require authentication
  if (isAdminRoute(pathname)) {
    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }

    try {
      await jose.jwtVerify(token, JWT_SECRET)
      return NextResponse.next()
    } catch (error) {
      console.error("JWT verification failed in middleware:", error)
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }
  }

  // Default: allow access
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
