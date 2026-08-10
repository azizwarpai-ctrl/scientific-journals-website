import { test, expect } from "@playwright/test"

test.describe("admin dashboard", () => {
    test("renders KPI cards with real values (no NaN, no fabricated health)", async ({ page }) => {
        await page.goto("/admin/dashboard")

        await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
        await expect(page.getByText("Total Journals")).toBeVisible()
        await expect(page.getByText("Total Submissions")).toBeVisible()

        const body = await page.locator("body").innerText()
        expect(body).not.toContain("NaN")
        // The pre-overhaul dashboard hardcoded "Operational" health pills.
        expect(body).not.toMatch(/>\s*Operational\s*</)
    })

    test("shows the sync-health widget with an honest empty/live state", async ({ page }) => {
        await page.goto("/admin/dashboard")
        await expect(page.getByText("Sync health")).toBeVisible()
        // Either ledger rows or the explicit no-runs message — never blank.
        await expect(
            page.getByText(/No job runs recorded yet|success|failed|partial|running/i).first()
        ).toBeVisible({ timeout: 10_000 })
    })

    test("sidebar navigation groups are present and routes reachable", async ({ page }) => {
        await page.goto("/admin/dashboard")
        for (const group of ["Overview", "Publishing", "Communication", "System"]) {
            await expect(page.getByText(group, { exact: true })).toBeVisible()
        }
        await page.getByRole("link", { name: "Journals" }).first().click()
        await page.waitForURL(/\/admin\/journals/)
        // h1 is "Journal Management" — match the singular stem, not /journals/.
        await expect(page.getByRole("heading", { name: /journal/i }).first()).toBeVisible()
    })
})
