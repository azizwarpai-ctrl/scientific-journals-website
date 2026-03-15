"use client"

import { useRegistrationStore } from "../../stores/registration-store"
import { RegistrationProgress } from "./registration-progress"
import { StepPersonalInfo } from "./step-personal-info"
import { StepAcademicInfo } from "./step-academic-info"
import { StepRoleSelection } from "./step-role-selection"
import { StepPolicyAgreements } from "./step-policy-agreements"
import { StepReviewSubmit } from "./step-review-submit"

const STEP_COMPONENTS = [
  StepPersonalInfo,
  StepAcademicInfo,
  StepRoleSelection,
  StepPolicyAgreements,
  StepReviewSubmit,
]

export function RegistrationWizard() {
  const { currentStep } = useRegistrationStore()
  const StepComponent = STEP_COMPONENTS[currentStep] ?? StepPersonalInfo

  return (
    <div className="w-full">
      <RegistrationProgress />
      <StepComponent />
    </div>
  )
}
