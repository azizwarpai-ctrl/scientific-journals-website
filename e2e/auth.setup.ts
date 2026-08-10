import { test as setup, expect } from "@playwright/test"
import { SignJWT } from "jose"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com"
// Fresh CI databases seed exactly one admin → autoincrement id 1. Override
// with E2E_ADMIN_ID when running against a local DB whose admin has a
// different id (the id must exist — /api/auth/me looks the user up by it).
const ADMIN_ID = process.env.E2E_ADMIN_ID ?? "1"

/**
 * Mints the `auth_token` session cookie directly instead of driving the UI
 * login. The UI path cannot complete in CI: admin login requires an emailed
 * OTP, and with OTP_DELIVERY_METHOD=console the digits are never output
 * anywhere a test could read (in production mode, console delivery fails
 * closed with a 503). The JWT below mirrors createSession() in
 * src/lib/db/auth-edge.ts exactly — same claims, alg, and expiry — so
 * middleware and /api/auth/me accept it end-to-end.
 *
 * Requires JWT_SECRET in the environment (same value the app server uses).
 */
setup("authenticate as admin", async ({ browser }) => {
    const secret = process.env.JWT_SECRET
    if (!secret) {
        throw new Error("[auth.setup] JWT_SECRET must be set for e2e runs")
    }

    const token = await new SignJWT({
        userId: ADMIN_ID,
        email: ADMIN_EMAIL,
        full_name: "E2E Admin",
        role: "superadmin",
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(new TextEncoder().encode(secret))

    const context = await browser.newContext()
    await context.addCookies([
        {
            name: "auth_token",
            value: token,
            domain: "localhost",
            path: "/",
            httpOnly: true,
            sameSite: "Lax",
        },
    ])

    // Smoke-verify the forged session end-to-end: middleware JWT check plus
    // the /api/auth/me DB lookup behind the admin header must both accept it.
    const page = await context.newPage()
    await page.goto("/admin/dashboard")
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 15_000 })

    await context.storageState({ path: "e2e/.auth/admin.json" })
    await context.close()
})
