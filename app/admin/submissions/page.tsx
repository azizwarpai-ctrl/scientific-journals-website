"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useGetOjsSubmissions,
  ReviewsList,
  OjsStatusBanner,
  isOjsUnavailable,
} from "@/src/features/reviews"
import { useDebouncedValue } from "@/src/hooks/use-debounced-value"

const STAGE_OPTIONS = [
  { value: "1", label: "Submission" },
  { value: "2", label: "Internal Review" },
  { value: "3", label: "External Review" },
  { value: "4", label: "Copyediting" },
  { value: "5", label: "Production" },
]

const STATUS_OPTIONS = [
  { value: "1", label: "Queued" },
  { value: "3", label: "Published" },
  { value: "4", label: "Declined" },
  { value: "5", label: "Scheduled" },
]

export default function SubmissionsPage() {
  const [search, setSearch] = useState("")
  const [stageId, setStageId] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  const { data, isLoading, error } = useGetOjsSubmissions({
    page,
    search: debouncedSearch || undefined,
    stageId: stageId === "all" ? undefined : Number(stageId),
    status: status === "all" ? undefined : Number(status),
  })

  if (data && data.configured === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Submission Management</h1>
          <p className="text-muted-foreground mt-1">Live submissions from OJS</p>
        </div>
        <OjsStatusBanner state="unconfigured" />
      </div>
    )
  }

  if (isOjsUnavailable(error)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Submission Management</h1>
          <p className="text-muted-foreground mt-1">Live submissions from OJS</p>
        </div>
        <OjsStatusBanner state="unavailable" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Submission Management</h1>
        <p className="text-muted-foreground mt-1">
          Live submissions from OJS with review progress
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by title..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-sm"
        />
        <Select
          value={stageId}
          onValueChange={(v) => {
            setStageId(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse">
          Loading submissions...
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Error loading submissions: {(error as Error).message}
          </p>
        </div>
      ) : (
        <>
          <ReviewsList submissions={data?.data || []} />
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages} (
                {data.pagination.total} submissions)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.pagination.hasPrev}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="bg-transparent transition-transform duration-150 ease-out active:scale-[0.97]"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data.pagination.hasNext}
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
    </div>
  )
}
