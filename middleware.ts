import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isPublicRoute, isAdminRoute } from "@/config/routes"
import { getJwtSecret } from "@/src/lib/db/auth-edge"
import * as jose from "jose"

// Paths that must never be indexed even if a crawler somehow reaches them.
// Robots.txt already disallows them, but we send X-Robots-Tag as a second
// line of defense so an externally-linked URL is dropped from the index
// rather than surfacing in GSC as "couldn't fetch" / "403 forbidden".
const NOINDEX_PREFIXES = ["/admin", "/api", "/auth", "/account"] as const

function isNoindexPath(pathname: string): boolean {
  return NOINDEX_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  )
}

function withNoindex(response: NextResponse, pathname: string): NextResponse {
  if (isNoindexPath(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
  }
  return response
}

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
      const JWT_SECRET = getJwtSecret()
      await jose.jwtVerify(token, JWT_SECRET)
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    } catch {
      // Token invalid, let it proceed to login page
    }
  }

  // Public routes - allow access
  if (isPublicRoute(pathname)) {
    return withNoindex(NextResponse.next(), pathname)
  }

  // Admin routes - require authentication
  if (isAdminRoute(pathname)) {
    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      url.searchParams.set("redirect", pathname)
      return withNoindex(NextResponse.redirect(url), pathname)
    }

    try {
      const JWT_SECRET = getJwtSecret()
      await jose.jwtVerify(token, JWT_SECRET)
      return withNoindex(NextResponse.next(), pathname)
    } catch (error) {
      console.error("JWT verification failed in middleware:", error)
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      url.searchParams.set("redirect", pathname)
      return withNoindex(NextResponse.redirect(url), pathname)
    }
  }

  // Default: allow access
  return withNoindex(NextResponse.next(), pathname)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
