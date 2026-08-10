"use client"

import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink, CheckCircle2 } from "lucide-react"
import { useRegistrationStore } from "@/src/features/auth/stores/registration-store"
import { COUNTRIES } from "@/src/features/auth/components/register/countries-data"
import { useOjsRegister, type OjsRegisterResponse } from "@/src/features/auth/api/use-ojs-register"
import Link from "next/link"
import { useState } from "react"

const ROLE_LABELS: Record<string, string> = {
  author: "Author",
  reviewer: "Reviewer",
  editor: "Editor",
  reader: "Reader",
}

/** Client-side fallback OJS login URL when the server didn't return one */
function fallbackOjsLoginUrl(journalPath: string | null): string {
  const base = (
    process.env.NEXT_PUBLIC_OJS_BASE_URL || "https://journals.digitopub.com"
  ).replace(/\/+$/, "")
  return `${base}/index.php/${journalPath || "index"}/login`
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

  const [successData, setSuccessData] = useState<{
    email: string
    ojsLoginUrl: string
  } | null>(null)

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
      setSuccessData({
        email: data.email || personalInfo.email,
        ojsLoginUrl: data.ojsLoginUrl || fallbackOjsLoginUrl(selectedJournalPath),
      })
    },
  })

  const handleSubmit = () => {
    const payload = getPayload()
    registerMutation.mutate({
      payload,
      journalPath: selectedJournalPath || ""
    })
  }

  const emailAlreadyExists = submissionError
    ?.toLowerCase()
    .includes("email already exists")

  // ── Success state ──
  if (successData) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-green-700 dark:text-green-400">
            Account Created Successfully
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your account{" "}
            <span className="font-medium text-foreground">
              {successData.email}
            </span>{" "}
            is ready. Sign in on the journal site with the email and password
            you just chose.
          </p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-3 max-w-sm mx-auto">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <ExternalLink className="inline h-3 w-3 mr-1" />
            Sign-in happens on <strong>Submit Manager</strong> (OJS) — our
            external manuscript submission platform.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <a href={successData.ojsLoginUrl} target="_self">
              Sign in on the journal site
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/journals">Back to journals</Link>
          </Button>
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
            onClick={() => setStep(1)}
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
            onClick={() => setStep(2)}
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
            onClick={() => setStep(3)}
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
            onClick={() => setStep(4)}
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

      {/* Post-registration notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-3">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <ExternalLink className="inline h-3 w-3 mr-1" />
          After registration, you can sign in on <strong>Submit Manager</strong>{" "}
          — our manuscript submission platform powered by OJS.
        </p>
      </div>

      {/* Error display */}
      {submissionError && (
        <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20 space-y-2">
          {emailAlreadyExists ? (
            <>
              <p className="text-sm text-red-600 dark:text-red-400">
                An account with this email already exists on the journal site.
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Try{" "}
                <a
                  href={fallbackOjsLoginUrl(selectedJournalPath)}
                  className="font-medium underline underline-offset-2"
                >
                  signing in on the journal site
                </a>{" "}
                or use its password reset if you&apos;ve forgotten your
                password.
              </p>
            </>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">
              {submissionError ||
                "Something went wrong while creating your account. Please try again."}
            </p>
          )}
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
