"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { OfferForm } from "./offer-form"
import { useUpdateOffer } from "../api/use-admin-offers"
import type { OfferCreateInput } from "../schemas/offer-schema"
import type { Offer } from "../types/offer"
import { Loader2 } from "lucide-react"

interface OfferEditClientProps {
  id: string
}

export function OfferEditClient({ id }: OfferEditClientProps) {
  const router = useRouter()
  const { mutateAsync: updateOffer, isPending } = useUpdateOffer(id)

  const { data: offer, isLoading, error } = useQuery<Offer>({
    queryKey: ["admin-offer-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/offers/admin/${id}`)
      if (!res.ok) {
        throw new Error("Failed to load offer details")
      }
      const json = await res.json()
      return json.data as Offer
    },
  })

  const handleSubmit = async (data: OfferCreateInput) => {
    await updateOffer(data)
    router.push("/admin/offers")
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Loading package details...</p>
      </div>
    )
  }

  if (error || !offer) {
    return (
      <div className="p-8 text-center text-destructive">
        <p className="font-semibold">Failed to load package details</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error instanceof Error ? error.message : "Offer not found"}
        </p>
      </div>
    )
  }

  return (
    <OfferForm
      initialData={offer}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      title={`Edit: ${offer.name}`}
    />
  )
}
