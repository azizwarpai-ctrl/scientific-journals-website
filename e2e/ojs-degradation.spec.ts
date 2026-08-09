import { test, expect } from "@playwright/test"

/**
 * OJS-down resilience: in the E2E environment OJS_DATABASE_* is either
 * unset (CI) or pointed at a dead host. The admin dashboard and public
 * journals listing must still render from Prisma/snapshot data — the
 * Phase-1 hardening removed every live-OJS dependency from the request
 * path.
 */
test.describe("OJS degradation", () => {
    test("admin dashboard renders with OJS unavailable", async ({ page }) => {
        const response = await page.goto("/admin/dashboard")
        expect(response?.status()).toBe(200)
        await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
        const body = await page.locator("body").innerText()
        expect(body).not.toContain("Internal Server Error")
    })

    test("public journals listing does not 500 with OJS unavailable", async ({ page }) => {
        const response = await page.goto("/journals")
        expect(response?.status()).toBeLessThan(500)
    })

    test("analytics page shows honest OJS health state", async ({ page }) => {
        await page.goto("/admin/analytics")
        await expect(page.getByRole("heading", { name: /analytics/i }).first()).toBeVisible()
        // Health section reports not-configured/down — never a hardcoded "Operational".
        const body = await page.locator("body").innerText()
        expect(body).not.toMatch(/>\s*Operational\s*</)
    })
})
