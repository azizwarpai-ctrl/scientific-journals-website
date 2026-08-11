import { test, expect } from "@playwright/test"

test.describe("admin analytics deep-dive", () => {
  test("renders KPIs, the journal filter, and chart regions without NaN", async ({ page }) => {
    await page.goto("/admin/analytics")
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible()
    // Journal filter present.
    await expect(page.getByRole("combobox").first()).toBeVisible({ timeout: 10_000 })
    // At least one chart card heading renders.
    await expect(page.getByText(/Submissions & Publications|Status distribution/i).first()).toBeVisible({ timeout: 10_000 })
    const body = await page.locator("body").innerText()
    expect(body).not.toContain("NaN")
  })
})
