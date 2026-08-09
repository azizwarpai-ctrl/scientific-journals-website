import { test as setup, expect } from "@playwright/test"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme"

/**
 * Logs in once and persists the session cookie for the chromium project.
 * Credentials come from ADMIN_EMAIL/ADMIN_PASSWORD (same env vars the
 * seeding path uses — see scripts/seed-e2e-admin.ts for CI).
 */
setup("authenticate as admin", async ({ page }) => {
    await page.goto("/admin/login")
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD)
    await page.getByRole("button", { name: /sign in|log in|login/i }).click()
    await page.waitForURL(/\/admin\/(dashboard|verify-code)/, { timeout: 15_000 })
    // OTP flows are disabled in E2E (OTP_DELIVERY_METHOD=console + admin
    // seeded verified); landing anywhere in /admin proves the cookie is set.
    await expect(page).toHaveURL(/\/admin\//)
    await page.context().storageState({ path: "e2e/.auth/admin.json" })
})
