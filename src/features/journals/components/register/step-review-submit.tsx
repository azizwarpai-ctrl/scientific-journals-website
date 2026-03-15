"use client"

import { Button } from "@/components/ui/button"
import { useJournalRegistrationStore } from "../../stores/journal-registration-store"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export function StepReviewSubmit() {
  const {
    publisherInfo,
    journalInfo,
    editorialInfo,
    publicationDetails,
    technicalConfig,
    isSubmitting,
    submissionError,
    setSubmitting,
    setSubmissionError,
    getPayload,
    prevStep,
  } = useJournalRegistrationStore()

  const handleRegistrationSubmit = async () => {
    setSubmitting(true)
    setSubmissionError(null)

    try {
      const payload = getPayload()

      // Endpoint to be created in the future
      const response = await fetch("/api/journals/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || "Registration failed. Please try again.")
      }

      // Success logic: Redirect to a success page or dashboard
      window.location.href = "/journals/register/success"
    } catch (error: any) {
      setSubmissionError(error.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-semibold">7. Review & Submit</h2>
        <p className="text-sm text-muted-foreground">
          Please verify the information provided. Once submitted, the journal setup process will begin.
        </p>
      </div>

      {submissionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Registration Error</AlertTitle>
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6 rounded-lg border p-4 bg-muted/30">
        <div>
          <h3 className="font-medium text-sm text-primary mb-2">Publisher Information</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Publisher Name:</dt><dd className="font-medium">{publisherInfo.publisherName}</dd></div>
            <div><dt className="text-muted-foreground">Institution:</dt><dd className="font-medium">{publisherInfo.institution}</dd></div>
            <div><dt className="text-muted-foreground">Email:</dt><dd className="font-medium">{publisherInfo.contactEmail}</dd></div>
            <div><dt className="text-muted-foreground">Country:</dt><dd className="font-medium">{publisherInfo.country}</dd></div>
          </dl>
        </div>

        <div className="h-px bg-border my-2" />

        <div>
          <h3 className="font-medium text-sm text-primary mb-2">Journal Identity</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Title:</dt><dd className="font-medium">{journalInfo.title}</dd></div>
            <div><dt className="text-muted-foreground">Abbreviation:</dt><dd className="font-medium">{journalInfo.abbreviation}</dd></div>
            <div><dt className="text-muted-foreground">Print ISSN:</dt><dd className="font-medium">{journalInfo.printIssn || "N/A"}</dd></div>
            <div><dt className="text-muted-foreground">Online ISSN:</dt><dd className="font-medium">{journalInfo.onlineIssn || "N/A"}</dd></div>
          </dl>
        </div>

        <div className="h-px bg-border my-2" />

        <div>
          <h3 className="font-medium text-sm text-primary mb-2">Editorial & Policies</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Editor in Chief:</dt><dd className="font-medium">{editorialInfo.editorInChief}</dd></div>
            <div><dt className="text-muted-foreground">Review Policy:</dt><dd className="font-medium">{publicationDetails.peerReviewPolicy}</dd></div>
            <div><dt className="text-muted-foreground">Access Model:</dt><dd className="font-medium">{publicationDetails.openAccessPolicy}</dd></div>
            <div><dt className="text-muted-foreground">APC Fee (USD):</dt><dd className="font-medium">${publicationDetails.publicationFee}</dd></div>
          </dl>
        </div>

        <div className="h-px bg-border my-2" />

        <div>
          <h3 className="font-medium text-sm text-primary mb-2">Technical Setup</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Platform URL:</dt><dd className="font-medium">digitopub.com/{technicalConfig.requestedUrlPath}</dd></div>
            {technicalConfig.customDomain && (
              <div><dt className="text-muted-foreground">Custom Domain:</dt><dd className="font-medium">{technicalConfig.customDomain}</dd></div>
            )}
          </dl>
        </div>
      </div>

      <div className="flex items-start gap-2 text-sm text-muted-foreground pt-2">
        <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary" />
        <p>By clicking "Submit Registration", you authorize Digitopub to create an administrative OJS portal for this journal. Our team will automatically provision the database architecture.</p>
      </div>

      <div className="flex justify-between pt-2">
        <Button 
          variant="outline" 
          onClick={prevStep} 
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button 
          onClick={handleRegistrationSubmit} 
          disabled={isSubmitting}
          className="w-32"
        >
          {isSubmitting ? "Creating..." : "Submit Registration"}
        </Button>
      </div>
    </div>
  )
}
