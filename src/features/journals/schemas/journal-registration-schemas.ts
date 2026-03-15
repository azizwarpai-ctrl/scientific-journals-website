import { z } from "zod"

// ═══════════════════════════════════════════════════════════════
// Step 1 — Publisher Information
// ═══════════════════════════════════════════════════════════════
export const publisherInfoSchema = z.object({
  publisherName: z.string().min(1, "Publisher name is required").max(255),
  institution: z.string().min(1, "Institution name is required").max(255),
  country: z.string().min(1, "Country is required").max(90),
  publisherAddress: z.string().min(10, "Please provide a complete address").max(500),
  contactEmail: z.string().email("Please enter a valid email address"),
  website: z.string().url("Please enter a valid URL including https://").optional().or(z.literal("")),
})

// ═══════════════════════════════════════════════════════════════
// Step 2 — Journal Information
// ═══════════════════════════════════════════════════════════════
const ISSN_REGEX = /^\d{4}-\d{3}[\dxX]$/i

export const journalInfoSchema = z.object({
  title: z.string().min(1, "Journal title is required").max(255),
  abbreviation: z.string().min(2, "Abbreviation should be at least 2 characters").max(20),
  printIssn: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || ISSN_REGEX.test(val), "ISSN must be in format 0000-0000"),
  onlineIssn: z
    .string()
    .min(1, "Online ISSN is highly recommended")
    .regex(ISSN_REGEX, "ISSN must be in format 0000-0000")
    .optional()
    .or(z.literal("")),
  discipline: z.string().min(1, "Please select a primary discipline").max(100),
  description: z.string().min(50, "Please provide a detailed description (minimum 50 characters)").max(2000),
})
// Require at least one ISSN
.refine((data) => data.printIssn || data.onlineIssn, {
  message: "At least one ISSN (Print or Online) is required",
  path: ["onlineIssn"],
})

// ═══════════════════════════════════════════════════════════════
// Step 3 — Editorial Information
// ═══════════════════════════════════════════════════════════════
export const editorialInfoSchema = z.object({
  editorInChief: z.string().min(1, "Editor-in-Chief name is required").max(255),
  editorEmail: z.string().email("Please enter a valid email address"),
  editorialBoardContact: z.string().email("Please enter a generic board email (e.g., editorial_board@journal.com)"),
  editorialAddress: z.string().min(10, "Please provide the complete editorial address").max(500),
})

// ═══════════════════════════════════════════════════════════════
// Step 4 — Publication Details
// ═══════════════════════════════════════════════════════════════
export const publicationDetailsSchema = z.object({
  frequency: z.enum(["Annually", "Biannually", "Quarterly", "Monthly", "Continuous"], {
    error: "Please select a publication frequency",
  }),
  language: z.enum(["English", "Arabic", "Bilingual"], {
    error: "Please select a primary language",
  }),
  peerReviewPolicy: z.enum(["Double-blind", "Single-blind", "Open", "Post-publication"], {
    error: "Please select a peer review policy",
  }),
  openAccessPolicy: z.enum(["Gold", "Green", "Hybrid", "Subscription"], {
    error: "Please select an Open Access policy",
  }),
  publicationFee: z.number().min(0, "Fee cannot be negative"),
})

// ═══════════════════════════════════════════════════════════════
// Step 5 — Technical & OJS Configuration
// ═══════════════════════════════════════════════════════════════
export const technicalConfigSchema = z.object({
  requestedUrlPath: z
    .string()
    .min(2, "Path must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Path can only contain lowercase letters, numbers, and hyphens (e.g. 'jme' or 'ij-med')"),
  customDomain: z.string().url("Must be a valid URL").optional().or(z.literal("")),
})

// ═══════════════════════════════════════════════════════════════
// Step 6 — Platform Agreements
// ═══════════════════════════════════════════════════════════════
export const termsAgreementsSchema = z.object({
  ethicsConfirmation: z.boolean().refine((v) => v === true, {
    message: "You must confirm adherence to COPE or equivalent ethics",
  }),
  copyrightAcceptance: z.boolean().refine((v) => v === true, {
    message: "You must define and accept publishing copyright terms",
  }),
  platformPolicy: z.boolean().refine((v) => v === true, {
    message: "You must agree to the Digitopub hosting and platform rules",
  }),
})

// ═══════════════════════════════════════════════════════════════
// Combined payload for API
// ═══════════════════════════════════════════════════════════════
export const journalRegistrationPayloadSchema = publisherInfoSchema
  .merge(journalInfoSchema)
  .merge(editorialInfoSchema)
  .merge(publicationDetailsSchema)
  .merge(technicalConfigSchema)
  .merge(termsAgreementsSchema)

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════
export type PublisherInfoValues = z.infer<typeof publisherInfoSchema>
export type JournalInfoValues = z.infer<typeof journalInfoSchema>
export type EditorialInfoValues = z.infer<typeof editorialInfoSchema>
export type PublicationDetailsValues = z.infer<typeof publicationDetailsSchema>
export type TechnicalConfigValues = z.infer<typeof technicalConfigSchema>
export type TermsAgreementsValues = z.infer<typeof termsAgreementsSchema>
export type JournalRegistrationPayload = z.infer<typeof journalRegistrationPayloadSchema>

export const JOURNAL_REGISTRATION_STEPS = [
  { id: "publisher", label: "Publisher", schema: publisherInfoSchema },
  { id: "journal", label: "Journal Info", schema: journalInfoSchema },
  { id: "editorial", label: "Editorial", schema: editorialInfoSchema },
  { id: "publication", label: "Publication", schema: publicationDetailsSchema },
  { id: "technical", label: "Technical Config", schema: technicalConfigSchema },
  { id: "terms", label: "Agreements", schema: termsAgreementsSchema },
  { id: "review", label: "Review & Submit", schema: null },
] as const

export type JournalRegistrationStepId = (typeof JOURNAL_REGISTRATION_STEPS)[number]["id"]
