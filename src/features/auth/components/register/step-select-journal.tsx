"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useRegistrationStore } from "@/src/features/auth/stores/registration-store"
import { useGetJournals } from "@/src/features/journals/api/use-get-journals"
import type { Journal } from "@/src/features/journals/types/journal-type"
import { cn } from "@/src/lib/utils"
import { AlertCircle, BookOpen, RefreshCw } from "lucide-react"

export function StepSelectJournal() {
  const { selectedJournalPath, setSelectedJournalPath, nextStep, markStepCompleted } =
    useRegistrationStore()

  const { data: journals, isLoading, isError, refetch, isRefetching } = useGetJournals()

  // Only journals that exist in OJS (non-null ojs_path) and are active can
  // receive registrations — journalPath must match OJS journals.path.
  const selectableJournals = useMemo(
    () =>
      (journals ?? []).filter(
        (j): j is Journal & { ojs_path: string } =>
          Boolean(j.ojs_path) && j.status === "active"
      ),
    [journals]
  )

  const handleContinue = () => {
    if (!selectedJournalPath) return
    markStepCompleted(0)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-semibold">Select a Journal</h2>
        <p className="text-sm text-muted-foreground">
          Choose the journal you want to register with. Your account will be
          created on that journal&apos;s submission system.
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading journals">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border-2 border-muted p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4 text-center space-y-3">
          <AlertCircle className="mx-auto h-6 w-6 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-600 dark:text-red-400">
            We couldn&apos;t load the list of journals. Please try again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isRefetching && "animate-spin")} />
            Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && selectableJournals.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <BookOpen className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No journals available</p>
          <p className="text-xs text-muted-foreground">
            No journals are currently accepting registrations. Please check back
            later or contact support.
          </p>
        </div>
      )}

      {/* Journal radio-card list */}
      {!isLoading && !isError && selectableJournals.length > 0 && (
        <div
          className="grid gap-3"
          role="radiogroup"
          aria-label="Available journals"
        >
          {selectableJournals.map((journal) => {
            const isSelected = selectedJournalPath === journal.ojs_path

            return (
              <div
                key={journal.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (!selectedJournalPath && selectableJournals[0].id === journal.id) ? 0 : -1}
                onClick={() => setSelectedJournalPath(journal.ojs_path)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSelectedJournalPath(journal.ojs_path)
                  }
                }}
                className={cn(
                  "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all duration-200 cursor-pointer",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isSelected && "text-primary"
                    )}
                  >
                    {journal.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {journal.abbreviation
                      ? `${journal.abbreviation} · ${journal.field}`
                      : journal.field}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!selectedJournalPath}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
