"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { useGetReviews, ReviewStatCards, ReviewsList } from "@/src/features/reviews"

export default function ReviewsPage() {
  const { data, isLoading, error } = useGetReviews()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Review Management</h1>
          <p className="text-muted-foreground mt-1">Manage peer reviews and reviewer assignments</p>
        </div>
        <Link href="/admin/reviews/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Assign Reviewer
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse">Loading reviews...</div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">Error loading reviews: {(error as Error).message}</p>
        </div>
      ) : (
        <>
          <ReviewStatCards reviews={data?.data || []} />
          <ReviewsList reviews={data?.data || []} />
        </>
      )}
    </div>
  )
}

