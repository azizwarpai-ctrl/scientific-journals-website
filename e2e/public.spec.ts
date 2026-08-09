import { test, expect } from "@playwright/test"

test.describe("public site", () => {
    test("homepage renders", async ({ page }) => {
        const response = await page.goto("/")
        expect(response?.status()).toBe(200)
        await expect(page.locator("h1").first()).toBeVisible()
    })

    test("journals listing renders without a server error", async ({ page }) => {
        const response = await page.goto("/journals")
        expect(response?.status()).toBeLessThan(500)
        // Either journal cards or an honest empty state.
        await expect(page.locator("main")).toBeVisible()
        const body = await page.locator("body").innerText()
        expect(body).not.toContain("Internal Server Error")
    })
})
