import { describe, it, expect } from "vitest"
import { formatCurrency } from "@/src/features/journals/utils/format-currency"

describe("format-currency", () => {
  it("formats integer amounts cleanly in USD by default", () => {
    const formatted = formatCurrency(500)
    expect(formatted).toBe("$500")
  })

  it("formats decimal amounts with 2 decimal places", () => {
    const formatted = formatCurrency(123.45)
    expect(formatted).toBe("$123.45")
  })

  it("supports different valid ISO currency codes", () => {
    const eur = formatCurrency(250, "EUR")
    expect(eur).toContain("250")
  })

  it("falls back gracefully when given an invalid currency code", () => {
    const fallback = formatCurrency(300, "XYZ123")
    expect(fallback).toBe("300 XYZ123")
  })
})
