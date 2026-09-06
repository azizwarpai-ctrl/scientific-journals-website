"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Sparkles, Tag, CheckCircle2 } from "lucide-react"
import { PricingTable } from "./pricing-table"
import { useAdminPricingPlans } from "../api/use-admin-pricing-plans"
import { Card, CardContent } from "@/components/ui/card"

export function PricingAdminClient() {
  const [filterActive, setFilterActive] = useState<string>("all")
  const { data: plans = [], isLoading, isError, error, refetch } = useAdminPricingPlans()

  const totalCount = plans.length
  const activeCount = plans.filter((p) => p.is_active).length
  const featuredCount = plans.filter((p) => p.is_featured || p.is_popular).length

  const filteredPlans = plans.filter((p) => {
    if (filterActive === "active") return p.is_active
    if (filterActive === "inactive") return !p.is_active
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-500" />
            Pricing Plans & Packages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage public pricing tiers, included features, display badges, and Stripe integration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/submit-manager#pricing" target="_blank">
              View Public Pricing
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Link href="/admin/pricing/new">
              <Plus className="w-4 h-4 mr-1.5" />
              New Plan
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Plans</p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Plans</p>
              <p className="text-2xl font-bold text-foreground mt-1">{activeCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Featured / Popular</p>
              <p className="text-2xl font-bold text-foreground mt-1">{featuredCount}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Table */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            type="button"
            onClick={() => setFilterActive("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterActive === "all"
                ? "bg-indigo-600 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All Plans ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterActive("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterActive === "active"
                ? "bg-indigo-600 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterActive("inactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterActive === "inactive"
                ? "bg-indigo-600 text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Inactive ({totalCount - activeCount})
          </button>
        </div>

        {isError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-3">
            <p className="text-sm font-medium text-destructive">
              {error instanceof Error ? error.message : "Failed to load pricing plans"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="cursor-pointer"
            >
              Retry
            </Button>
          </div>
        ) : (
          <PricingTable plans={filteredPlans} isLoading={isLoading} />
        )}
      </div>
    </div>
  )
}
