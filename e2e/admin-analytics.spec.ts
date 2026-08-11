import { test, expect } from "@playwright/test"

test.describe("admin analytics deep-dive", () => {
  test("renders KPIs, the journal filter, and chart regions without NaN", async ({ page }) => {
    await page.goto("/admin/analytics")
    await expect(page.getByRole("heading", { name: /analytics/i })).toBeVisible()
    // A KPI backed by local data renders regardless of OJS state.
    await expect(page.getByText("Total Journals")).toBeVisible()
    // Journal filter present.
    await expect(page.getByRole("combobox").first()).toBeVisible({ timeout: 10_000 })
    // The deep-dive region resolves to one of three states depending on OJS
    // reachability (charts render, OJS-unavailable notice, or load-error notice).
    // CI cannot reach OJS, so accept any of them — all are correct UI.
    await expect(
      page
        .getByText(
          /Submissions & Publications|Status distribution|sourced live from OJS|load the chart data/i,
        )
        .first(),
    ).toBeVisible({ timeout: 10_000 })
    const body = await page.locator("body").innerText()
    expect(body).not.toContain("NaN")
  })
})
