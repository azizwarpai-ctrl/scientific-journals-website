import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
  REGISTRATION_STEPS,
  type PersonalInfoValues,
  type AcademicInfoValues,
  type RoleSelectionValues,
  type PolicyAgreementsValues,
  type RegistrationPayload,
} from "@/src/features/auth/schemas/registration-schemas"

// ═══════════════════════════════════════════════════════════════
// Store State
// ═══════════════════════════════════════════════════════════════

interface RegistrationState {
  /** Current step (0-indexed) */
  currentStep: number

  /** Step data */
  personalInfo: PersonalInfoValues
  academicInfo: AcademicInfoValues
  roleSelection: RoleSelectionValues
  policyAgreements: PolicyAgreementsValues

  /** Track which steps have been visited / validated */
  completedSteps: Set<number>

  /** Submission status */
  isSubmitting: boolean
  submissionError: string | null

  /** Verification state */
  verificationEmail: string | null

  /** Selected Journal Path (for SSO redirect after registration) */
  selectedJournalPath: string | null
}

interface RegistrationActions {
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void

  setPersonalInfo: (data: Partial<PersonalInfoValues>) => void
  setAcademicInfo: (data: Partial<AcademicInfoValues>) => void
  setRoleSelection: (data: Partial<RoleSelectionValues>) => void
  setPolicyAgreements: (data: Partial<PolicyAgreementsValues>) => void

  markStepCompleted: (step: number) => void
  isStepCompleted: (step: number) => boolean

  setSubmitting: (isSubmitting: boolean) => void
  setSubmissionError: (error: string | null) => void
  setVerificationEmail: (email: string | null) => void
  setSelectedJournalPath: (path: string | null) => void

  /** Build the final payload for API submission */
  getPayload: () => RegistrationPayload

  /** Reset all store data */
  reset: () => void
}

type RegistrationStore = RegistrationState & RegistrationActions

// ═══════════════════════════════════════════════════════════════
// Defaults
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PERSONAL_INFO: PersonalInfoValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  country: "",
  phone: "",
}

const DEFAULT_ACADEMIC_INFO: AcademicInfoValues = {
  affiliation: "",
  department: "",
  orcid: "",
  biography: "",
}

const DEFAULT_ROLE_SELECTION: RoleSelectionValues = {
  primaryRole: "author",
  interestedJournalIds: [],
}

const DEFAULT_POLICY_AGREEMENTS: PolicyAgreementsValues = {
  termsOfService: false,
  privacyPolicy: false,
  publishingEthics: false,
}

const TOTAL_STEPS = REGISTRATION_STEPS.length

// ═══════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════

export const useRegistrationStore = create<RegistrationStore>()(
  persist(
    (set, get) => ({
      // ─── State ──────────────────────────────────────────
      currentStep: 0,
      personalInfo: { ...DEFAULT_PERSONAL_INFO },
      academicInfo: { ...DEFAULT_ACADEMIC_INFO },
      roleSelection: { ...DEFAULT_ROLE_SELECTION },
      policyAgreements: { ...DEFAULT_POLICY_AGREEMENTS },
      completedSteps: new Set<number>(),
      isSubmitting: false,
      submissionError: null,
      verificationEmail: null,
      selectedJournalPath: null,
      
      // ─── Step Management ─────────────────────────────────────
      setStep: (step) => {
        if (step >= 0 && step < TOTAL_STEPS) {
          set({ currentStep: step })
        }
      },

      nextStep: () => {
        const { currentStep } = get()
        if (currentStep < TOTAL_STEPS - 1) {
          set({ currentStep: currentStep + 1 })
        }
      },

      prevStep: () => {
        const { currentStep } = get()
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 })
        }
      },

      // ─── Data Setters ───────────────────────────────────
      setPersonalInfo: (data) =>
        set((state) => ({
          personalInfo: { ...state.personalInfo, ...data },
        })),

      setAcademicInfo: (data) =>
        set((state) => ({
          academicInfo: { ...state.academicInfo, ...data },
        })),

      setRoleSelection: (data) =>
        set((state) => ({
          roleSelection: { ...state.roleSelection, ...data },
        })),

      setPolicyAgreements: (data) =>
        set((state) => ({
          policyAgreements: { ...state.policyAgreements, ...data },
        })),

      // ─── Step Tracking ──────────────────────────────────
      markStepCompleted: (step) =>
        set((state) => {
          const newCompleted = new Set(state.completedSteps)
          newCompleted.add(step)
          return { completedSteps: newCompleted }
        }),

      isStepCompleted: (step) => get().completedSteps.has(step),

      // ─── Submission State ───────────────────────────────
      setSubmitting: (isSubmitting) => set({ isSubmitting }),
      setSubmissionError: (error) => set({ submissionError: error }),
      setVerificationEmail: (email) => set({ verificationEmail: email }),
      setSelectedJournalPath: (path) => set({ selectedJournalPath: path }),

      // ─── Payload Builder ────────────────────────────────
      getPayload: () => {
        const { personalInfo, academicInfo, roleSelection, policyAgreements } =
          get()
        return {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          email: personalInfo.email,
          password: personalInfo.password,
          country: personalInfo.country,
          phone: personalInfo.phone || "",
          affiliation: academicInfo.affiliation,
          department: academicInfo.department || "",
          orcid: academicInfo.orcid || "",
          biography: academicInfo.biography || "",
          primaryRole: roleSelection.primaryRole,
          interestedJournalIds: roleSelection.interestedJournalIds || [],
          termsOfService: policyAgreements.termsOfService as true,
          privacyPolicy: policyAgreements.privacyPolicy as true,
          publishingEthics: policyAgreements.publishingEthics as true,
        }
      },

      // ─── Reset ──────────────────────────────────────────
      reset: () =>
        set({
          currentStep: 0,
          personalInfo: { ...DEFAULT_PERSONAL_INFO },
          academicInfo: { ...DEFAULT_ACADEMIC_INFO },
          roleSelection: { ...DEFAULT_ROLE_SELECTION },
          policyAgreements: { ...DEFAULT_POLICY_AGREEMENTS },
          completedSteps: new Set<number>(),
          isSubmitting: false,
          submissionError: null,
          verificationEmail: null,
          selectedJournalPath: null,
        }),
    }),
    {
      name: "digitopub-registration",
      storage: createJSONStorage(() => sessionStorage),
      // Exclude sensitive data and transient state from persistence
      partialize: (state) => ({
        currentStep: state.currentStep,
        personalInfo: {
          ...state.personalInfo,
          // Never persist passwords
          password: "",
          confirmPassword: "",
        },
        academicInfo: state.academicInfo,
        roleSelection: state.roleSelection,
        policyAgreements: state.policyAgreements,
        verificationEmail: state.verificationEmail,
        selectedJournalPath: state.selectedJournalPath,
        completedSteps: Array.from(state.completedSteps),
      }),
      // Rehydrate the Set from the persisted array
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (Array.isArray(state.completedSteps)) {
            state.completedSteps = new Set(state.completedSteps as unknown as number[])
          }
          if (!state.personalInfo?.password) {
            state.currentStep = 0
            state.completedSteps = new Set<number>()
          }
        }
      },
    }
  )
)
