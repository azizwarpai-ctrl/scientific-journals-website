"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useRegistrationStore } from "@/src/features/auth/stores/registration-store"
import { COUNTRIES } from "@/src/features/auth/components/register/countries-data"
import { useOjsRegister, type OjsRegisterResponse } from "@/src/features/auth/api/use-ojs-register"

const ROLE_LABELS: Record<string, string> = {
  author: "Author",
  reviewer: "Reviewer",
  editor: "Editor",
  reader: "Reader",
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: string | undefined | null
}) {
  if (!value) return null
  return (
    <div className="flex justify-between py-1.5 text-sm border-b border-dashed border-muted last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">
        {value}
      </span>
    </div>
  )
}

export function StepReviewSubmit() {
  const {
    personalInfo,
    academicInfo,
    roleSelection,
    policyAgreements,
    prevStep,
    setStep,
    isSubmitting,
    setSubmitting,
    submissionError,
    setSubmissionError,
    getPayload,
    selectedJournalPath,
  } = useRegistrationStore()

  const countryName =
    COUNTRIES.find((c) => c.code === personalInfo.country)?.name ??
    personalInfo.country

  const registerMutation = useOjsRegister({
    onMutate: () => {
      setSubmitting(true)
      setSubmissionError(null)
    },
    onError: (error: Error) => {
      setSubmitting(false)
      setSubmissionError(error.message)
    },
    onSuccess: (data: OjsRegisterResponse) => {
      setSubmitting(false)

      if (data.status === "sso_redirect" && data.ssoUrl) {
        window.location.href = data.ssoUrl;
      } else {
        setSubmissionError("Registration succeeded but SSO handover failed. Please contact support.")
      }
    },
  })

  const handleSubmit = () => {
    const payload = getPayload()
    registerMutation.mutate({
      payload,
      journalPath: selectedJournalPath || ""
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-semibold">Review &amp; Submit</h2>
        <p className="text-sm text-muted-foreground">
          Please review your information before creating your account.
        </p>
      </div>

      {/* Personal Information */}
      <div className="rounded-lg border p-4 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-primary">
            Personal Information
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStep(0)}
          >
            Edit
          </Button>
        </div>
        <SummaryRow
          label="Name"
          value={`${personalInfo.firstName} ${personalInfo.lastName}`}
        />
        <SummaryRow label="Email" value={personalInfo.email} />
        <SummaryRow label="Country" value={countryName} />
        <SummaryRow label="Phone" value={personalInfo.phone} />
      </div>

      {/* Academic Information */}
      <div className="rounded-lg border p-4 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-primary">
            Academic Information
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStep(1)}
          >
            Edit
          </Button>
        </div>
        <SummaryRow label="Affiliation" value={academicInfo.affiliation} />
        <SummaryRow label="Department" value={academicInfo.department} />
        <SummaryRow label="ORCID" value={academicInfo.orcid} />
        <SummaryRow
          label="Biography"
          value={
            academicInfo.biography
              ? academicInfo.biography.length > 80
                ? academicInfo.biography.slice(0, 80) + "…"
                : academicInfo.biography
              : undefined
          }
        />
      </div>

      {/* Role */}
      <div className="rounded-lg border p-4 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-primary">
            Selected Role
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStep(2)}
          >
            Edit
          </Button>
        </div>
        <SummaryRow
          label="Primary Role"
          value={ROLE_LABELS[roleSelection.primaryRole] ?? roleSelection.primaryRole}
        />
      </div>

      {/* Agreements */}
      <div className="rounded-lg border p-4 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-primary">Agreements</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStep(3)}
          >
            Edit
          </Button>
        </div>
        <SummaryRow
          label="Terms of Service"
          value={policyAgreements.termsOfService ? "Accepted" : "Not accepted"}
        />
        <SummaryRow
          label="Privacy Policy"
          value={policyAgreements.privacyPolicy ? "Accepted" : "Not accepted"}
        />
        <SummaryRow
          label="Publishing Ethics"
          value={
            policyAgreements.publishingEthics ? "Accepted" : "Not accepted"
          }
        />
      </div>

      {/* Error display */}
      {submissionError && (
        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            {submissionError}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </div>
    </div>
  )
}
