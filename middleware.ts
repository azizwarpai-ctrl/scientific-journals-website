import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import * as jose from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export async function middleware(request: NextRequest) {
    // Only run on /admin routes
    if (request.nextUrl.pathname.startsWith("/admin")) {
        const token = request.cookies.get("auth_token")?.value
        const isLoginPage = request.nextUrl.pathname === "/admin/login"
        const isRegisterPage = request.nextUrl.pathname === "/admin/register" // If exists

        if (!token) {
            // If no token and trying to access protected route, redirect to login
            if (!isLoginPage && !isRegisterPage) {
                return NextResponse.redirect(new URL("/admin/login", request.url))
            }
            // If no token and on login page, allow
            return NextResponse.next()
        }

        try {
            // Verify token
            const verified = await jose.jwtVerify(token, JWT_SECRET)

            // If token is valid and user is on login page, redirect to dashboard
            if (verified && isLoginPage) {
                return NextResponse.redirect(new URL("/admin/dashboard", request.url))
            }

            // Token valid, proceed
            return NextResponse.next()
        } catch (err) {
            // Token invalid/expired
            if (!isLoginPage) {
                return NextResponse.redirect(new URL("/admin/login", request.url))
            }
            return NextResponse.next()
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/admin/:path*"],
}
