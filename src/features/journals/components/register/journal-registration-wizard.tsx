"use client"

import { useJournalRegistrationStore } from "../../stores/journal-registration-store"
import { JOURNAL_REGISTRATION_STEPS } from "../../schemas/journal-registration-schemas"
import { StepPublisherInfo } from "./step-publisher-info"
import { StepJournalInfo } from "./step-journal-info"
import { StepEditorialInfo } from "./step-editorial-info"
import { StepPublicationDetails } from "./step-publication-details"
import { StepTechnicalConfig } from "./step-technical-config"
import { StepTermsAgreements } from "./step-terms-agreements"
import { StepReviewSubmit } from "./step-review-submit"
import { useEffect } from "react"
import { Check } from "lucide-react"

export function JournalRegistrationWizard() {
  const { currentStep } = useJournalRegistrationStore()

  // Prevent hydration errors by not rendering until mounted
  const [mounted, setMounted] = React.useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="min-h-[400px] flex items-center justify-center">Loading journal registration...</div>
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <StepPublisherInfo />
      case 1: return <StepJournalInfo />
      case 2: return <StepEditorialInfo />
      case 3: return <StepPublicationDetails />
      case 4: return <StepTechnicalConfig />
      case 5: return <StepTermsAgreements />
      case 6: return <StepReviewSubmit />
      default: return null
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto md:grid md:grid-cols-12 md:gap-8 bg-card rounded-xl border shadow-sm overflow-hidden min-h-[600px]">
      
      {/* Sidebar Navigation */}
      <div className="hidden md:block md:col-span-4 bg-muted/40 p-6 border-r">
        <div className="mb-8">
          <h3 className="font-semibold text-lg">Journal Setup</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Complete the form to register your publication on the platform.
          </p>
        </div>

        <nav aria-label="Progress">
          <ol role="list" className="overflow-hidden">
            {JOURNAL_REGISTRATION_STEPS.map((step, index) => {
              const isCurrent = currentStep === index
              const isComplete = currentStep > index

              return (
                <li
                  key={step.id}
                  className={`relative pb-8 ${index === JOURNAL_REGISTRATION_STEPS.length - 1 ? "" : ""}`}
                >
                  {index !== JOURNAL_REGISTRATION_STEPS.length - 1 ? (
                    <div
                      className={`absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 ${
                        isComplete ? "bg-primary" : "bg-border"
                      }`}
                      aria-hidden="true"
                    />
                  ) : null}
                  <div className="relative flex items-start group">
                    <span className="h-9 flex items-center">
                      <span
                        className={`relative z-10 w-8 h-8 flex items-center justify-center rounded-full border-2 
                          ${isComplete ? "bg-primary border-primary" 
                          : isCurrent ? "bg-background border-primary" 
                          : "bg-background border-muted"}`}
                      >
                        {isComplete ? (
                          <Check className="h-4 w-4 text-primary-foreground" />
                        ) : (
                          <span
                            className={`text-sm font-medium ${
                              isCurrent ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {index + 1}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="ml-4 min-w-0 flex flex-col pt-1.5">
                      <span className={`text-sm font-medium ${isCurrent ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="md:col-span-8 p-6 md:p-8">
        {/* Mobile Progress Bar (Visible only on small screens) */}
        <div className="md:hidden mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-primary">
              Step {currentStep + 1} of {JOURNAL_REGISTRATION_STEPS.length}
            </span>
            <span className="text-muted-foreground">
              {JOURNAL_REGISTRATION_STEPS[currentStep].label}
            </span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300 ease-in-out"
              style={{ width: `${((currentStep + 1) / JOURNAL_REGISTRATION_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Form Step */}
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          {renderStep()}
        </div>
      </div>
    </div>
  )
}

import React from "react"
