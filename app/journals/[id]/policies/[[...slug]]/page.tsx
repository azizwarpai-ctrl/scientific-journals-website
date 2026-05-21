import { notFound } from "next/navigation"

import { isValidPolicySlug } from "@/src/features/journals"
import { JournalDetailView } from "@/app/journals/[id]/page"

interface JournalPoliciesRouteProps {
  params: Promise<{ id: string; slug?: string[] }>
}

export default async function JournalPoliciesRoute({
  params,
}: JournalPoliciesRouteProps) {
  const { slug } = await params

  if (!slug || slug.length === 0) {
    return <JournalDetailView initialTab="policies" initialPolicySlug={null} />
  }

  if (slug.length !== 1 || !isValidPolicySlug(slug[0])) {
    notFound()
  }

  return <JournalDetailView initialTab="policies" initialPolicySlug={slug[0]} />
}
