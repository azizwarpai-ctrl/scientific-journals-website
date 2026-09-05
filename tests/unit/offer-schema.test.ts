import { describe, it, expect } from "vitest"
import {
  offerCreateSchema,
  offerUpdateSchema,
  offerIdParamSchema,
  offerToggleSchema,
  offerReorderSchema,
} from "@/src/features/offers/schemas/offer-schema"

describe("Offer Schemas", () => {
  describe("offerCreateSchema", () => {
    const validOffer = {
      name: "Standard Publication",
      slug: "standard-publication",
      description: "Standard peer-review and open access publishing.",
      price_cents: 14900,
      currency: "USD",
      billing_interval: "month" as const,
      features: ["Peer review", "DOI Assignment", "Open Access"],
      cta_text: "Get Started",
      is_active: true,
      is_featured: false,
      sort_order: 1,
    }

    it("should accept valid offer with all fields", () => {
      const result = offerCreateSchema.safeParse(validOffer)
      expect(result.success).toBe(true)
    })

    it("should accept minimal valid offer and apply defaults", () => {
      const minimal = {
        name: "Minimal Offer",
        slug: "minimal-offer",
        features: ["Feature A"],
      }
      const result = offerCreateSchema.safeParse(minimal)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.price_cents).toBe(0)
        expect(result.data.currency).toBe("USD")
        expect(result.data.billing_interval).toBe("month")
        expect(result.data.cta_text).toBe("Get Started")
        expect(result.data.is_active).toBe(true)
        expect(result.data.is_featured).toBe(false)
        expect(result.data.sort_order).toBe(0)
      }
    })

    it("should reject empty name", () => {
      const result = offerCreateSchema.safeParse({
        ...validOffer,
        name: "",
      })
      expect(result.success).toBe(false)
    })

    it("should reject invalid slug formats", () => {
      const invalidSlugs = [
        "Standard Package", // contains spaces
        "standard_package", // contains underscore
        "Standard-Package", // contains uppercase
        "-leading-hyphen",
        "trailing-hyphen-",
        "double--hyphen",
      ]
      for (const slug of invalidSlugs) {
        const result = offerCreateSchema.safeParse({
          ...validOffer,
          slug,
        })
        expect(result.success, `Expected slug "${slug}" to fail validation`).toBe(false)
      }
    })

    it("should accept valid kebab-case slugs", () => {
      const validSlugs = ["basic", "basic-author-1", "pro-2026-bundle", "a-b-c"]
      for (const slug of validSlugs) {
        const result = offerCreateSchema.safeParse({
          ...validOffer,
          slug,
        })
        expect(result.success, `Expected slug "${slug}" to pass validation`).toBe(true)
      }
    })

    it("should reject empty features array", () => {
      const result = offerCreateSchema.safeParse({
        ...validOffer,
        features: [],
      })
      expect(result.success).toBe(false)
    })

    it("should reject empty feature items", () => {
      const result = offerCreateSchema.safeParse({
        ...validOffer,
        features: ["Valid feature", "   "],
      })
      expect(result.success).toBe(false)
    })

    it("should enforce 3-letter uppercase currency", () => {
      const invalidCurrencies = ["us", "USDT", "usd", "123", "$$$"]
      for (const curr of invalidCurrencies) {
        const result = offerCreateSchema.safeParse({
          ...validOffer,
          currency: curr,
        })
        expect(result.success).toBe(false)
      }

      const validCurrencies = ["USD", "EUR", "GBP", "JPY", "CAD"]
      for (const curr of validCurrencies) {
        const result = offerCreateSchema.safeParse({
          ...validOffer,
          currency: curr,
        })
        expect(result.success).toBe(true)
      }
    })

    it("should validate billing_interval values", () => {
      for (const interval of ["one_time", "month", "year"]) {
        const result = offerCreateSchema.safeParse({
          ...validOffer,
          billing_interval: interval,
        })
        expect(result.success).toBe(true)
      }

      const result = offerCreateSchema.safeParse({
        ...validOffer,
        billing_interval: "daily",
      })
      expect(result.success).toBe(false)
    })

    it("should reject negative price_cents", () => {
      const result = offerCreateSchema.safeParse({
        ...validOffer,
        price_cents: -50,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("offerUpdateSchema", () => {
    it("should accept empty object for partial updates", () => {
      const result = offerUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it("should accept partial field updates", () => {
      const result = offerUpdateSchema.safeParse({
        name: "Updated Name",
        price_cents: 19900,
        is_featured: true,
      })
      expect(result.success).toBe(true)
    })

    it("should validate slug when provided in update", () => {
      const result = offerUpdateSchema.safeParse({
        slug: "Invalid Slug!",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("offerIdParamSchema", () => {
    it("should accept numeric string IDs", () => {
      expect(offerIdParamSchema.safeParse({ id: "1" }).success).toBe(true)
      expect(offerIdParamSchema.safeParse({ id: "12345" }).success).toBe(true)
    })

    it("should reject non-numeric string IDs", () => {
      expect(offerIdParamSchema.safeParse({ id: "abc" }).success).toBe(false)
      expect(offerIdParamSchema.safeParse({ id: "1;DROP TABLE" }).success).toBe(false)
      expect(offerIdParamSchema.safeParse({ id: "-1" }).success).toBe(false)
    })
  })

  describe("offerToggleSchema & offerReorderSchema", () => {
    it("should accept boolean is_active or empty in toggle schema", () => {
      expect(offerToggleSchema.safeParse({ is_active: true }).success).toBe(true)
      expect(offerToggleSchema.safeParse({ is_active: false }).success).toBe(true)
      expect(offerToggleSchema.safeParse({}).success).toBe(true)
    })

    it("should validate integer sort_order in reorder schema", () => {
      expect(offerReorderSchema.safeParse({ sort_order: 5 }).success).toBe(true)
      expect(offerReorderSchema.safeParse({ sort_order: 0 }).success).toBe(true)
      expect(offerReorderSchema.safeParse({ sort_order: -2 }).success).toBe(true)
      expect(offerReorderSchema.safeParse({ sort_order: "abc" }).success).toBe(false)
    })
  })
})
