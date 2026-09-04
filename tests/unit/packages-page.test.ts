import { describe, it, expect } from "vitest"
import { isPublicRoute } from "@/config/routes"

describe("Packages Page Route & Configuration", () => {
  it("includes /packages in PUBLIC_ROUTES", () => {
    expect(isPublicRoute("/packages")).toBe(true)
  })

  it("permits public visitors to access packages page", () => {
    expect(isPublicRoute("/packages")).toBe(true)
  })
})
