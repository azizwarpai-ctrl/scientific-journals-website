"use client"

import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink } from "lucide-react"
import { useRegistrationStore } from "@/src/features/auth/stores/registration-store"
import { COUNTRIES } from "@/src/features/auth/components/register/countries-data"
import { useOjsRegister, type OjsRegisterResponse } from "@/src/features/auth/api/use-ojs-register"
import { useState } from "react"

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

/** Countdown seconds before auto-redirect */
const REDIRECT_DELAY_SECONDS = 3

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

  const [redirecting, setRedirecting] = useState(false)
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_SECONDS)

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
        // Show redirect indicator before navigating
        setRedirecting(true)
        setCountdown(REDIRECT_DELAY_SECONDS)
        const url = data.ssoUrl

        let remaining = REDIRECT_DELAY_SECONDS
        const timer = setInterval(() => {
          remaining -= 1
          setCountdown(remaining)
          if (remaining <= 0) {
            clearInterval(timer)
            window.location.href = url
          }
        }, 1000)
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

  // ── Redirect state ──
  if (redirecting) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <ExternalLink className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
            Account Created Successfully!
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You will be redirected to the submission system in{" "}
            <span className="font-bold text-foreground">{countdown}</span>{" "}
            {countdown === 1 ? "second" : "seconds"}…
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Preparing your journal session…</span>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 max-w-sm mx-auto">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <ExternalLink className="inline h-3 w-3 mr-1" />
            You are being redirected to <strong>Submit Manager</strong> (OJS) — our external manuscript submission platform.
          </p>
        </div>
      </div>
    )
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

      {/* Redirect notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-3">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <ExternalLink className="inline h-3 w-3 mr-1" />
          After registration, you will be redirected to <strong>Submit Manager</strong> — our manuscript submission platform powered by OJS.
        </p>
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
