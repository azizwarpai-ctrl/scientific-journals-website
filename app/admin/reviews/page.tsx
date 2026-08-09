"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useGetReviewOverview,
  useGetReviewers,
  ReviewStatCards,
  ReviewerWorkloadTable,
  OjsStatusBanner,
  isOjsUnavailable,
} from "@/src/features/reviews"
import { useDebouncedValue } from "@/src/hooks/use-debounced-value"

export default function ReviewsPage() {
  const overview = useGetReviewOverview()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const reviewers = useGetReviewers({ page, search: debouncedSearch || undefined })

  const unconfigured =
    (overview.data && overview.data.configured === false) ||
    (reviewers.data && reviewers.data.configured === false)
  const unavailable = isOjsUnavailable(overview.error) || isOjsUnavailable(reviewers.error)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Arbitration Panel</h1>
        <p className="text-muted-foreground mt-1">
          Live peer-review pipeline from OJS — monitor progress and reviewer workload
        </p>
      </div>

      {unconfigured ? (
        <OjsStatusBanner state="unconfigured" />
      ) : unavailable ? (
        <OjsStatusBanner state="unavailable" />
      ) : (
        <>
          {overview.isLoading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">
              Loading review overview...
            </div>
          ) : overview.error ? (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                Error loading overview: {(overview.error as Error).message}
              </p>
            </div>
          ) : overview.data?.data ? (
            <ReviewStatCards overview={overview.data.data} />
          ) : null}

          <div className="flex items-center gap-2">
            <Input
              placeholder="Search reviewers by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="max-w-sm"
            />
          </div>

          {reviewers.isLoading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">
              Loading reviewers...
            </div>
          ) : reviewers.error ? (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                Error loading reviewers: {(reviewers.error as Error).message}
              </p>
            </div>
          ) : (
            <>
              <ReviewerWorkloadTable reviewers={reviewers.data?.data || []} />
              {reviewers.data?.pagination && reviewers.data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {reviewers.data.pagination.page} of {reviewers.data.pagination.totalPages} (
                    {reviewers.data.pagination.total} reviewers)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!reviewers.data.pagination.hasPrev}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="bg-transparent transition-transform duration-150 ease-out active:scale-[0.97]"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!reviewers.data.pagination.hasNext}
                      onClick={() => setPage((p) => p + 1)}
                      className="bg-transparent transition-transform duration-150 ease-out active:scale-[0.97]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
