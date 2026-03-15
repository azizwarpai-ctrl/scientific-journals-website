import { z } from "zod"

// ═══════════════════════════════════════════════════════════════
// Step 1 — Personal Information
// ═══════════════════════════════════════════════════════════════

export const personalInfoSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name must be 100 characters or fewer"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(100, "Last name must be 100 characters or fewer"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128, "Password must be 128 characters or fewer"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    country: z.string().min(1, "Country is required").max(90),
    phone: z
      .string()
      .max(32, "Phone number must be 32 characters or fewer")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

/** Pre-refinement shape (used for store typing where passwords haven't been compared yet) */
export const personalInfoBaseSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or fewer"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or fewer"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password must be 128 characters or fewer"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  country: z.string().min(1, "Country is required").max(90),
  phone: z
    .string()
    .max(32, "Phone number must be 32 characters or fewer")
    .optional()
    .or(z.literal("")),
})

// ═══════════════════════════════════════════════════════════════
// Step 2 — Academic / Institutional Information
// ═══════════════════════════════════════════════════════════════

const ORCID_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i

export const academicInfoSchema = z.object({
  affiliation: z
    .string()
    .min(1, "Affiliation is required")
    .max(255, "Affiliation must be 255 characters or fewer"),
  department: z
    .string()
    .max(255, "Department must be 255 characters or fewer")
    .optional()
    .or(z.literal("")),
  orcid: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (val) => !val || ORCID_REGEX.test(val),
      "ORCID must be in format 0000-0000-0000-000X"
    ),
  biography: z
    .string()
    .max(2000, "Biography must be 2000 characters or fewer")
    .optional()
    .or(z.literal("")),
})

// ═══════════════════════════════════════════════════════════════
// Step 3 — Role Selection
// ═══════════════════════════════════════════════════════════════

export const VALID_ROLES = [
  "author",
  "reviewer",
  "editor",
  "reader",
] as const

export type UserRole = (typeof VALID_ROLES)[number]

export const roleSelectionSchema = z.object({
  primaryRole: z.enum(VALID_ROLES, {
    message: "Please select a role",
  }),
  interestedJournalIds: z.array(z.string()).optional(),
})

// ═══════════════════════════════════════════════════════════════
// Step 4 — Policy Agreements
// ═══════════════════════════════════════════════════════════════

export const policyAgreementsSchema = z.object({
  termsOfService: z.boolean().refine((v) => v === true, {
    message: "You must accept the Terms of Service",
  }),
  privacyPolicy: z.boolean().refine((v) => v === true, {
    message: "You must accept the Privacy Policy",
  }),
  publishingEthics: z.boolean().refine((v) => v === true, {
    message: "You must agree to the publishing ethics statement",
  }),
})

// ═══════════════════════════════════════════════════════════════
// Combined registration payload (sent to API)
// ═══════════════════════════════════════════════════════════════

export const registrationPayloadSchema = z.object({
  // Personal
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  country: z.string().min(1).max(90),
  phone: z.string().max(32).optional().or(z.literal("")),
  // Academic
  affiliation: z.string().min(1).max(255),
  department: z.string().max(255).optional().or(z.literal("")),
  orcid: z.string().optional().or(z.literal("")),
  biography: z.string().max(2000).optional().or(z.literal("")),
  // Role
  primaryRole: z.enum(VALID_ROLES),
  interestedJournalIds: z.array(z.string()).optional(),
  // Agreements
  termsOfService: z.boolean(),
  privacyPolicy: z.boolean(),
  publishingEthics: z.boolean(),
})

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type PersonalInfoValues = z.infer<typeof personalInfoBaseSchema>
export type AcademicInfoValues = z.infer<typeof academicInfoSchema>
export type RoleSelectionValues = z.infer<typeof roleSelectionSchema>
export type PolicyAgreementsValues = z.infer<typeof policyAgreementsSchema>
export type RegistrationPayload = z.infer<typeof registrationPayloadSchema>

/** Registration step metadata */
export const REGISTRATION_STEPS = [
  { id: "personal", label: "Personal Information", schema: personalInfoSchema },
  { id: "academic", label: "Academic Information", schema: academicInfoSchema },
  { id: "role", label: "Role Selection", schema: roleSelectionSchema },
  { id: "policies", label: "Agreements", schema: policyAgreementsSchema },
  { id: "review", label: "Review & Submit", schema: null },
] as const

export type RegistrationStepId = (typeof REGISTRATION_STEPS)[number]["id"]
