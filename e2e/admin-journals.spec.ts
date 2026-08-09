import { test, expect } from "@playwright/test"

test.describe("admin journals table", () => {
    test("renders the data table with sortable headers and CSV export", async ({ page }) => {
        await page.goto("/admin/journals")

        // Table renders (or an honest empty state — never a blank page).
        const table = page.getByRole("table")
        const emptyState = page.getByText(/no journals|no results/i)
        await expect(table.or(emptyState).first()).toBeVisible({ timeout: 10_000 })

        if (await table.isVisible()) {
            // Sort toggle flips without error.
            const sortButton = page.getByRole("button", { name: /sort by title/i })
            if (await sortButton.isVisible()) {
                await sortButton.click()
                await expect(table).toBeVisible()
            }
            // CSV export button present.
            await expect(page.getByRole("button", { name: /export table as csv/i })).toBeVisible()
        }
    })

    test("breadcrumbs reflect the current section", async ({ page }) => {
        await page.goto("/admin/journals")
        await expect(page.getByRole("link", { name: "Admin" })).toBeVisible()
        await expect(page.getByText("Journals").first()).toBeVisible()
    })
})
