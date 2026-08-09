import { defineConfig, devices } from "@playwright/test"

/**
 * E2E configuration. Journeys live in e2e/ (Vitest owns tests/ — the globs
 * never overlap). Locally, reuse a dev server you already have running
 * (`bun run dev`); in CI the webServer block builds nothing — CI builds
 * first, then `bun run start` serves the production bundle.
 */
export default defineConfig({
    testDir: "e2e",
    outputDir: "e2e/.results",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                storageState: "e2e/.auth/admin.json",
            },
            dependencies: ["setup"],
        },
        {
            name: "public",
            testMatch: /public\.spec\.ts/,
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: "bun run start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
})
