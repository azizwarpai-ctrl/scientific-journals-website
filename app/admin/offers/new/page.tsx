import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { OfferNewClient } from "@/src/features/offers/components/offer-new-client"

export const metadata = {
  title: "New Package / Offer | Admin Dashboard",
  description: "Create a new pricing tier or publication package.",
}

export default async function NewOfferPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  if (session.role !== "admin" && session.role !== "superadmin") {
    redirect("/admin/dashboard")
  }

  return <OfferNewClient />
}
