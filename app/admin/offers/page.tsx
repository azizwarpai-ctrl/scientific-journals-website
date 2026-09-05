import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { OffersAdminClient } from "@/src/features/offers/components/offers-admin-client"

export const metadata = {
  title: "Offers & Packages | Admin Dashboard",
  description: "Manage publication packages, tiers, pricing, and features.",
}

export default async function AdminOffersPage() {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  if (session.role !== "admin" && session.role !== "superadmin") {
    redirect("/admin/dashboard")
  }

  return <OffersAdminClient />
}
