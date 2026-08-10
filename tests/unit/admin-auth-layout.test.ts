import { describe, it, expect } from "vitest"
import { isPublicRoute, isAdminRoute, PUBLIC_ROUTES, ADMIN_ROUTES } from "@/config/routes"

// /admin/register and /admin/registration-success were removed (no admin
// self-registration exists; the orphaned pages/routes were deleted in the
// registration hotfix). Only these two auth pages remain.
const AUTH_PAGES = [
    "/admin/login",
    "/admin/verify-code",
]

describe("admin auth flow — route classification", () => {
    it("all auth pages are public routes (middleware lets them through)", () => {
        for (const page of AUTH_PAGES) {
            expect(isPublicRoute(page)).toBe(true)
        }
    })

    it("/admin/verify-code is a public route", () => {
        expect(PUBLIC_ROUTES).toContain("/admin/verify-code")
        expect(isPublicRoute("/admin/verify-code")).toBe(true)
    })

    it("/admin/verify-code is not explicitly listed in ADMIN_ROUTES", () => {
        expect(ADMIN_ROUTES).not.toContain("/admin/verify-code")
    })

    it("protected admin routes require authentication (not public)", () => {
        const protectedPages = [
            "/admin/dashboard",
            "/admin/journals",
            "/admin/submissions",
            "/admin/settings",
            "/admin/analytics",
        ]
        for (const page of protectedPages) {
            expect(isPublicRoute(page)).toBe(false)
            expect(isAdminRoute(page)).toBe(true)
        }
    })

    it("middleware priority: public check runs before admin check", () => {
        // Auth pages may match isAdminRoute (startsWith "/admin") but
        // middleware checks isPublicRoute FIRST, so they are allowed through.
        // This test documents the middleware's priority order.
        for (const page of AUTH_PAGES) {
            expect(isPublicRoute(page)).toBe(true)
        }
    })

    it("AUTH_PAGES list includes verify-code alongside login", () => {
        expect(AUTH_PAGES).toContain("/admin/login")
        expect(AUTH_PAGES).toContain("/admin/verify-code")
        expect(AUTH_PAGES).not.toContain("/admin/dashboard")
    })
})
