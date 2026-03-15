"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { REGISTRATION_STEPS } from "../../schemas/registration-schemas"
import { useRegistrationStore } from "../../stores/registration-store"

export function RegistrationProgress() {
  const { currentStep, completedSteps, setStep } = useRegistrationStore()

  return (
    <nav aria-label="Registration progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {REGISTRATION_STEPS.map((step, index) => {
          const isActive = currentStep === index
          const isCompleted = completedSteps.has(index)
          const isClickable = isCompleted || index <= currentStep

          return (
            <li key={step.id} className="flex-1 relative">
              <div className="flex flex-col items-center">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute top-4 -left-1/2 w-full h-0.5 -z-10",
                      isCompleted || isActive
                        ? "bg-primary"
                        : "bg-muted-foreground/20"
                    )}
                  />
                )}

                {/* Step circle */}
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setStep(index)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-200",
                    isActive &&
                      "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25",
                    isCompleted &&
                      !isActive &&
                      "border-primary bg-primary/10 text-primary cursor-pointer hover:bg-primary/20",
                    !isActive &&
                      !isCompleted &&
                      "border-muted-foreground/30 text-muted-foreground/50 cursor-not-allowed"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </button>

                {/* Label */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center leading-tight max-w-[80px]",
                    isActive && "text-primary",
                    isCompleted && !isActive && "text-foreground",
                    !isActive &&
                      !isCompleted &&
                      "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
