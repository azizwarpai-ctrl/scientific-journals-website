import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  PublisherInfoValues,
  JournalInfoValues,
  EditorialInfoValues,
  PublicationDetailsValues,
  TechnicalConfigValues,
  TermsAgreementsValues,
  JournalRegistrationPayload,
} from "../schemas/journal-registration-schemas"

// ═══════════════════════════════════════════════════════════════
// Store State
// ═══════════════════════════════════════════════════════════════

interface JournalRegistrationState {
  currentStep: number

  publisherInfo: PublisherInfoValues
  journalInfo: JournalInfoValues
  editorialInfo: EditorialInfoValues
  publicationDetails: PublicationDetailsValues
  technicalConfig: TechnicalConfigValues
  termsAgreements: TermsAgreementsValues

  completedSteps: Set<number>

  isSubmitting: boolean
  submissionError: string | null
}

interface JournalRegistrationActions {
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void

  setPublisherInfo: (data: Partial<PublisherInfoValues>) => void
  setJournalInfo: (data: Partial<JournalInfoValues>) => void
  setEditorialInfo: (data: Partial<EditorialInfoValues>) => void
  setPublicationDetails: (data: Partial<PublicationDetailsValues>) => void
  setTechnicalConfig: (data: Partial<TechnicalConfigValues>) => void
  setTermsAgreements: (data: Partial<TermsAgreementsValues>) => void

  markStepCompleted: (step: number) => void
  isStepCompleted: (step: number) => boolean

  setSubmitting: (isSubmitting: boolean) => void
  setSubmissionError: (error: string | null) => void

  getPayload: () => JournalRegistrationPayload
  reset: () => void
}

type JournalRegistrationStore = JournalRegistrationState & JournalRegistrationActions

// ═══════════════════════════════════════════════════════════════
// Defaults
// ═══════════════════════════════════════════════════════════════

const DEFAULT_PUBLISHER_INFO: PublisherInfoValues = {
  publisherName: "",
  institution: "",
  country: "",
  publisherAddress: "",
  contactEmail: "",
  website: "",
}

const DEFAULT_JOURNAL_INFO: JournalInfoValues = {
  title: "",
  abbreviation: "",
  printIssn: "",
  onlineIssn: "",
  discipline: "",
  description: "",
}

const DEFAULT_EDITORIAL_INFO: EditorialInfoValues = {
  editorInChief: "",
  editorEmail: "",
  editorialBoardContact: "",
  editorialAddress: "",
}

const DEFAULT_PUBLICATION_DETAILS: PublicationDetailsValues = {
  frequency: "Annually",
  language: "English",
  peerReviewPolicy: "Double-blind",
  openAccessPolicy: "Gold",
  publicationFee: 0,
}

const DEFAULT_TECHNICAL_CONFIG: TechnicalConfigValues = {
  requestedUrlPath: "",
  customDomain: "",
}

const DEFAULT_TERMS_AGREEMENTS: TermsAgreementsValues = {
  ethicsConfirmation: false,
  copyrightAcceptance: false,
  platformPolicy: false,
}

const TOTAL_STEPS = 7

// ═══════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════

function isNumberArray(arr: any): arr is number[] {
  return Array.isArray(arr) && arr.every((item) => typeof item === "number")
}

export const useJournalRegistrationStore = create<JournalRegistrationStore>()(
  persist(
    (set, get) => ({
      currentStep: 0,
      
      publisherInfo: { ...DEFAULT_PUBLISHER_INFO },
      journalInfo: { ...DEFAULT_JOURNAL_INFO },
      editorialInfo: { ...DEFAULT_EDITORIAL_INFO },
      publicationDetails: { ...DEFAULT_PUBLICATION_DETAILS },
      technicalConfig: { ...DEFAULT_TECHNICAL_CONFIG },
      termsAgreements: { ...DEFAULT_TERMS_AGREEMENTS },
      
      completedSteps: new Set<number>(),
      isSubmitting: false,
      submissionError: null,

      setStep: (step) => {
        if (step >= 0 && step < TOTAL_STEPS) set({ currentStep: step })
      },
      nextStep: () => {
        const { currentStep } = get()
        if (currentStep < TOTAL_STEPS - 1) set({ currentStep: currentStep + 1 })
      },
      prevStep: () => {
        const { currentStep } = get()
        if (currentStep > 0) set({ currentStep: currentStep - 1 })
      },

      setPublisherInfo: (data) => set((s) => ({ publisherInfo: { ...s.publisherInfo, ...data } })),
      setJournalInfo: (data) => set((s) => ({ journalInfo: { ...s.journalInfo, ...data } })),
      setEditorialInfo: (data) => set((s) => ({ editorialInfo: { ...s.editorialInfo, ...data } })),
      setPublicationDetails: (data) => set((s) => ({ publicationDetails: { ...s.publicationDetails, ...data } })),
      setTechnicalConfig: (data) => set((s) => ({ technicalConfig: { ...s.technicalConfig, ...data } })),
      setTermsAgreements: (data) => set((s) => ({ termsAgreements: { ...s.termsAgreements, ...data } })),

      markStepCompleted: (step) =>
        set((state) => {
          const newCompleted = new Set(state.completedSteps)
          newCompleted.add(step)
          return { completedSteps: newCompleted }
        }),
      isStepCompleted: (step) => get().completedSteps.has(step),

      setSubmitting: (isSubmitting) => set({ isSubmitting }),
      setSubmissionError: (error) => set({ submissionError: error }),

      getPayload: () => {
        const s = get()
        return {
          ...s.publisherInfo,
          ...s.journalInfo,
          ...s.editorialInfo,
          ...s.publicationDetails,
          ...s.technicalConfig,
          ...s.termsAgreements,
        }
      },

      reset: () =>
        set({
          currentStep: 0,
          publisherInfo: { ...DEFAULT_PUBLISHER_INFO },
          journalInfo: { ...DEFAULT_JOURNAL_INFO },
          editorialInfo: { ...DEFAULT_EDITORIAL_INFO },
          publicationDetails: { ...DEFAULT_PUBLICATION_DETAILS },
          technicalConfig: { ...DEFAULT_TECHNICAL_CONFIG },
          termsAgreements: { ...DEFAULT_TERMS_AGREEMENTS },
          completedSteps: new Set<number>(),
          isSubmitting: false,
          submissionError: null,
        }),
    }),
    {
      name: "digitopub-journal-registration",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        publisherInfo: state.publisherInfo,
        journalInfo: state.journalInfo,
        editorialInfo: state.editorialInfo,
        publicationDetails: state.publicationDetails,
        technicalConfig: state.technicalConfig,
        termsAgreements: state.termsAgreements,
        completedSteps: Array.from(state.completedSteps), // Persistence stores completedSteps as an array, rehydrate it to a Set
      }),
      onRehydrateStorage: () => (state) => {
        if (state && isNumberArray(state.completedSteps)) {
          state.completedSteps = new Set(state.completedSteps)
        }
      },
    }
  )
)
