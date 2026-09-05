import { redirect } from "next/navigation"
import { getSession } from "@/src/lib/db/auth"
import { OfferEditClient } from "@/src/features/offers/components/offer-edit-client"

export const metadata = {
  title: "Edit Package / Offer | Admin Dashboard",
  description: "Edit pricing package, features, and settings.",
}

interface EditOfferPageProps {
  params: Promise<{ id: string }>
}

export default async function EditOfferPage({ params }: EditOfferPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/admin/login")
  }

  if (session.role !== "admin" && session.role !== "superadmin") {
    redirect("/admin/dashboard")
  }

  const { id } = await params

  return <OfferEditClient id={id} />
}
