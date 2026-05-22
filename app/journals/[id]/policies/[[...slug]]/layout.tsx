import type { Metadata } from "next"
import { cache } from "react"

import { prisma } from "@/src/lib/db/config"
import { resolveJournalOjsId } from "@/src/features/journals/server/resolve-journal"
import {
  getPolicyTitleBySlug,
  isValidPolicySlug,
} from "@/src/features/journals"
import { buildCanonical } from "@/src/lib/seo/canonical"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string; slug?: string[] }>
}

const cachedResolveJournalOjsId = cache((id: string) => resolveJournalOjsId(id))

const getJournalTitle = cache(async (id: string): Promise<string | null> => {
  try {
    const select = { title: true } as const
    const byPath = await prisma.journal.findFirst({ where: { ojs_path: id }, select })
    if (byPath) return byPath.title
    const byOjsId = await prisma.journal.findFirst({ where: { ojs_id: id }, select })
    if (byOjsId) return byOjsId.title
    if (/^\d+$/.test(id)) {
      const byId = await prisma.journal.findUnique({ where: { id: BigInt(id) }, select })
      if (byId) return byId.title
    }
  } catch (err) {
    console.error("[policies-layout] failed to resolve journal title:", err)
  }
  return null
})

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { id, slug } = await params
  const resolved = await cachedResolveJournalOjsId(id)
  const canonicalId = resolved.found && resolved.ojsPath ? resolved.ojsPath : id

  const journalTitle = await getJournalTitle(id)
  const policySlug = slug && slug.length === 1 && isValidPolicySlug(slug[0]) ? slug[0] : null
  const policyTitle = policySlug ? getPolicyTitleBySlug(policySlug) : null

  const titleParts = [
    policyTitle ?? "Journal Policies",
    journalTitle,
  ].filter((part): part is string => Boolean(part))
  const title = titleParts.join(" — ")

  const canonicalPath = policySlug
    ? `/journals/${canonicalId}/policies/${policySlug}`
    : `/journals/${canonicalId}/policies`
  const canonicalUrl = buildCanonical(canonicalPath)

  const description = policyTitle && journalTitle
    ? `${policyTitle} for ${journalTitle}.`
    : journalTitle
      ? `Editorial policies for ${journalTitle}.`
      : undefined

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
    },
  }
}

export default function JournalPoliciesSegmentLayout({ children }: LayoutProps) {
  return <>{children}</>
}
