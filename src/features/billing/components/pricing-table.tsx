"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Pencil,
  Trash2,
  Sparkles,
  Plus,
  BookOpen,
} from "lucide-react"
import { PlanBadge } from "./plan-badge"
import type { SerializedPricingPlan } from "../api/use-pricing-plans"
import {
  useAdminPricingPlans,
  useTogglePricingPlan,
  useDeletePricingPlan,
  useReorderPricingPlan,
} from "../api/use-admin-pricing-plans"

interface PricingTableProps {
  plans?: SerializedPricingPlan[]
  isLoading?: boolean
}

export function PricingTable({ plans: propPlans, isLoading: propIsLoading }: PricingTableProps) {
  const { data: fetchedPlans, isLoading: queryIsLoading } = useAdminPricingPlans()
  const plans = propPlans || fetchedPlans || []
  const isLoading = propIsLoading !== undefined ? propIsLoading : queryIsLoading

  const { mutate: togglePlan, isPending: isToggling } = useTogglePricingPlan()
  const { mutate: deletePlan, isPending: isDeleting } = useDeletePricingPlan()
  const { mutate: reorderPlan } = useReorderPricingPlan()

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingReorders, setPendingReorders] = useState<Set<string>>(new Set())

  const handleToggle = (id: string, current: boolean) => {
    togglePlan({ id, is_active: !current })
  }

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      setDeletingId(id)
      deletePlan(id, {
        onSettled: () => setDeletingId(null),
      })
    }
  }

  const handleOrderChange = (id: string, newOrder: number) => {
    if (pendingReorders.has(id)) return
    setPendingReorders((prev) => new Set(prev).add(id))
    reorderPlan(
      { id, sort_order: newOrder },
      {
        onSettled: () => {
          setPendingReorders((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Loading pricing plans...
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-muted text-muted-foreground">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold">No pricing plans found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          You haven&apos;t configured any pricing plans yet. Create your first plan to display on the /submit-manager page.
        </p>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white">
          <Link href="/admin/pricing/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[60px]">Order</TableHead>
            <TableHead>Plan Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => {
            const numericPrice = Number(plan.price) || 0
            const priceFormatted = `$${numericPrice.toFixed(2)}`
            const isFeatured = Boolean(plan.is_featured || plan.is_popular)
            return (
              <TableRow key={plan.id} className="hover:bg-muted/30">
                <TableCell>
                  <input
                    type="number"
                    aria-label={`Sort order for ${plan.name}`}
                    defaultValue={plan.sort_order ?? 0}
                    disabled={pendingReorders.has(plan.id)}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val !== plan.sort_order) {
                        handleOrderChange(plan.id, val)
                      }
                    }}
                    className="w-12 h-7 px-1 text-center text-xs rounded border border-input bg-background"
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>{plan.name}</span>
                      {isFeatured && (
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 inline-block" />
                      )}
                    </div>
                    {plan.slug && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        /{plan.slug}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">
                    {numericPrice === 0 ? "Free" : priceFormatted}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {(plan.billing_interval || "one_time").replace("_", " ")}
                  </div>
                </TableCell>
                <TableCell>
                  {(plan as any).journal ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      <BookOpen className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{(plan as any).journal.title}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium">Global</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() => handleToggle(plan.id, plan.is_active)}
                      disabled={isToggling}
                    />
                    <PlanBadge type="status" value={plan.is_active} />
                  </div>
                </TableCell>
                <TableCell>
                  {isFeatured ? (
                    <PlanBadge type="featured" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={`/admin/pricing/${plan.id}/edit`}>
                        <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(plan.id, plan.name)}
                      disabled={isDeleting && deletingId === plan.id}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${plan.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
