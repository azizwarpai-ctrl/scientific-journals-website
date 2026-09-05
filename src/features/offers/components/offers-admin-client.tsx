"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Sparkles, Tag, CheckCircle2 } from "lucide-react"
import { OffersTable } from "./offers-table"
import { useAdminOffers } from "../api/use-admin-offers"
import { Card, CardContent } from "@/components/ui/card"

export function OffersAdminClient() {
  const [filterActive, setFilterActive] = useState<string>("all")
  const { data, isLoading } = useAdminOffers()

  const offers = data?.data || []

  const totalCount = offers.length
  const activeCount = offers.filter((o) => o.is_active).length
  const featuredCount = offers.filter((o) => o.is_featured).length

  const filteredOffers = offers.filter((o) => {
    if (filterActive === "active") return o.is_active
    if (filterActive === "inactive") return !o.is_active
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-500" />
            Packages & Offers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage public pricing packages, featured badges, included features, and journal assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/packages" target="_blank">
              View Public Page
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Link href="/admin/offers/new">
              <Plus className="w-4 h-4 mr-1.5" />
              New Package
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Packages</p>
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
              <p className="text-xs font-medium text-muted-foreground">Active Packages</p>
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
            All Packages ({totalCount})
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

        <OffersTable offers={filteredOffers} isLoading={isLoading} />
      </div>
    </div>
  )
}
