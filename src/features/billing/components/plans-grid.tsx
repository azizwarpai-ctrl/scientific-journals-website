"use client"

import React from "react"
import { usePricingPlans } from "../api/use-pricing-plans"
import { PlanCard } from "./plan-card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, PackageSearch } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PlansGridProps {
  journalId?: string
  className?: string
}

export function PlansGrid({ journalId, className }: PlansGridProps) {
  const { data: plans = [], isLoading, isError, error, refetch } = usePricingPlans(journalId)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 p-6 space-y-4 bg-card/40"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-10 w-1/2 rounded-md mt-4" />
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <Skeleton className="h-10 w-full rounded-lg mt-6" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-16 px-4 max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load packages</h3>
        <p className="text-sm text-muted-foreground mb-6">
          {error instanceof Error ? error.message : "Something went wrong fetching pricing packages."}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-16 px-4 max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-4">
          <PackageSearch className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No packages available</h3>
        <p className="text-sm text-muted-foreground">
          There are currently no active offers or packages available. Please check back soon or contact support for custom arrangements.
        </p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl mx-auto items-stretch ${className || ""}`}>
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan as any} />
      ))}
    </div>
  )
}
