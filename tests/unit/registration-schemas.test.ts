import { describe, it, expect } from "vitest"
import {
  personalInfoSchema,
  academicInfoSchema,
  roleSelectionSchema,
  policyAgreementsSchema,
  registrationPayloadSchema
} from "../../src/features/auth/schemas/registration-schemas"

describe("Registration Schemas", () => {
  describe("personalInfoSchema", () => {
    it("should reject mismatching passwords", () => {
      const data = {
        firstName: "John",
        lastName: "Doe",
        email: "test@example.com",
        password: "Password123!",
        confirmPassword: "password123!",
        country: "US"
      }
      const result = personalInfoSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined()
      }
    })

    it("should require a valid uppercase ISO country code", () => {
      const data = {
        firstName: "J", lastName: "D", email: "a@b.com",
        password: "Password123!", confirmPassword: "Password123!",
        country: "us"
      }
      const result = personalInfoSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe("academicInfoSchema", () => {
    it("should accept valid ORCID format", () => {
      const data = {
        affiliation: "Stanford",
        orcid: "0000-0002-1825-0097"
      }
      const result = academicInfoSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it("should reject invalid ORCID formats", () => {
      const data = {
        affiliation: "Stanford",
        orcid: "invalid-orcid-1234"
      }
      expect(academicInfoSchema.safeParse(data).success).toBe(false)
      
      const missingLength = { affiliation: "Stanford", orcid: "0000-0002-1825-009" }
      expect(academicInfoSchema.safeParse(missingLength).success).toBe(false)
    })
  })

  describe("policyAgreementsSchema", () => {
    it("should require all fields to be exactly true", () => {
      const data = {
        termsOfService: true,
        privacyPolicy: true,
        publishingEthics: true
      }
      expect(policyAgreementsSchema.safeParse(data).success).toBe(true)

      const incomplete = {
        termsOfService: true,
        privacyPolicy: false,
        publishingEthics: true
      }
      expect(policyAgreementsSchema.safeParse(incomplete).success).toBe(false)
    })
  })
})
