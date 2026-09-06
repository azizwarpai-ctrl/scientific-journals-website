"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { client } from "@/src/lib/rpc"
import { PlanForm } from "./plan-form"
import { useUpdatePricingPlan, useAdminPricingPlans } from "../api/use-admin-pricing-plans"
import type { PricingPlanCreateInput } from "../types/billing"
import type { SerializedPricingPlan } from "../api/use-pricing-plans"
import { Loader2 } from "lucide-react"

interface PlanEditClientProps {
  id: string
}

export function PlanEditClient({ id }: PlanEditClientProps) {
  const router = useRouter()
  const { mutateAsync: updatePlan, isPending } = useUpdatePricingPlan(id)

  const { data: allPlans, isLoading: isLoadingAll } = useAdminPricingPlans()

  const cachedPlan = allPlans?.find((p) => String(p.id) === String(id))

  const { data: directPlan, isLoading: isLoadingDirect, error } = useQuery<SerializedPricingPlan>({
    queryKey: ["admin-plan-detail", id],
    queryFn: async () => {
      const res = await client.billing.plans[":id"].$get({
        param: { id },
      })
      if (!res.ok) {
        throw new Error("Failed to load plan details")
      }
      const json = await res.json()
      return (json as { success: boolean; data: SerializedPricingPlan }).data
    },
    enabled: !cachedPlan,
  })

  const plan = cachedPlan || directPlan
  const isLoading = !plan && (isLoadingAll || isLoadingDirect)

  const handleSubmit = async (data: PricingPlanCreateInput) => {
    await updatePlan({ id, data })
    router.push("/admin/pricing")
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Loading plan details...</p>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="p-8 text-center text-destructive">
        <p className="font-semibold">Failed to load plan details</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "Plan not found"}
        </p>
      </div>
    )
  }

  return (
    <PlanForm
      initialData={plan}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      title={`Edit: ${plan.name}`}
    />
  )
}
