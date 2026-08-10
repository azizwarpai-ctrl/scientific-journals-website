"use client"

import { useEffect } from "react"
import { useRegistrationStore } from "../../stores/registration-store"
import { RegistrationProgress } from "./registration-progress"
import { StepSelectJournal } from "./step-select-journal"
import { StepPersonalInfo } from "./step-personal-info"
import { StepAcademicInfo } from "./step-academic-info"
import { StepRoleSelection } from "./step-role-selection"
import { StepPolicyAgreements } from "./step-policy-agreements"
import { StepReviewSubmit } from "./step-review-submit"

const STEP_COMPONENTS = [
  StepSelectJournal,
  StepPersonalInfo,
  StepAcademicInfo,
  StepRoleSelection,
  StepPolicyAgreements,
  StepReviewSubmit,
]

interface RegistrationWizardProps {
  /** Pre-selected OJS journal path (e.g. from a ?journalPath= link) — skips the journal step */
  initialJournalPath?: string
}

export function RegistrationWizard({ initialJournalPath }: RegistrationWizardProps) {
  const { currentStep, setSelectedJournalPath, markStepCompleted, setStep } =
    useRegistrationStore()

  useEffect(() => {
    if (!initialJournalPath) return
    setSelectedJournalPath(initialJournalPath)
    markStepCompleted(0)
    // Only auto-advance when the user is still on the journal step
    if (useRegistrationStore.getState().currentStep === 0) {
      setStep(1)
    }
  }, [initialJournalPath, setSelectedJournalPath, markStepCompleted, setStep])

  const StepComponent = STEP_COMPONENTS[currentStep] ?? StepSelectJournal

  return (
    <div className="w-full">
      <RegistrationProgress />
      <StepComponent />
    </div>
  )
}
