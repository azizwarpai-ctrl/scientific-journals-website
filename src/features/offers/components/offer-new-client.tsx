"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { OfferForm } from "./offer-form"
import { useCreateOffer } from "../api/use-admin-offers"
import type { OfferCreateInput } from "../schemas/offer-schema"

export function OfferNewClient() {
  const router = useRouter()
  const { mutateAsync: createOffer, isPending } = useCreateOffer()

  const handleSubmit = async (data: OfferCreateInput) => {
    await createOffer(data)
    router.push("/admin/offers")
  }

  return <OfferForm onSubmit={handleSubmit} isSubmitting={isPending} />
}
