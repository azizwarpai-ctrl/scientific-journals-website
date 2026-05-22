import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"

import { prisma } from "@/src/lib/db/config"
import { resolveJournalOjsId } from "@/src/features/journals/server/resolve-journal"
import { getPolicyTitleBySlug } from "@/src/features/journals"
import { buildCanonical } from "@/src/lib/seo/canonical"
import { JournalDetailView } from "@/app/journals/[id]/journal-detail-view"
import {
  TAB_SEGMENTS,
  TAB_TITLES,
  resolveTabSegments,
} from "@/app/journals/[id]/tab-config"

interface JournalTabRouteProps {
  params: Promise<{ id: string; tab: string[] }>
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
    console.error("[journal-tab-route] failed to resolve journal title:", err)
  }
  return null
})

export async function generateMetadata({
  params,
}: JournalTabRouteProps): Promise<Metadata> {
  const { id, tab } = await params
  const resolved = resolveTabSegments(tab)
  // Signal the 404 here — generateMetadata runs before the response streams,
  // so the status is set cleanly. Doing it only in the page component is too
  // late once the shell has flushed (status stays 200).
  if (!resolved) notFound()

  const journalTitle = await getJournalTitle(id)
  const ojsResolved = await cachedResolveJournalOjsId(id)
  const canonicalId =
    ojsResolved.found && ojsResolved.ojsPath ? ojsResolved.ojsPath : id

  const sectionTitle =
    resolved.tab === "policies" && resolved.policySlug
      ? getPolicyTitleBySlug(resolved.policySlug) ?? TAB_TITLES.policies
      : TAB_TITLES[resolved.tab]

  const title = [sectionTitle, journalTitle]
    .filter((part): part is string => Boolean(part))
    .join(" — ")

  const canonicalPath =
    resolved.tab === "policies" && resolved.policySlug
      ? `/journals/${canonicalId}/policies/${resolved.policySlug}`
      : `/journals/${canonicalId}/${TAB_SEGMENTS[resolved.tab]}`
  const canonicalUrl = buildCanonical(canonicalPath)

  const description = journalTitle
    ? `${sectionTitle} for ${journalTitle}.`
    : undefined

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
  }
}

export default async function JournalTabRoute({ params }: JournalTabRouteProps) {
  const { tab } = await params
  const resolved = resolveTabSegments(tab)
  if (!resolved) notFound()

  return (
    <JournalDetailView
      initialTab={resolved.tab}
      initialPolicySlug={resolved.policySlug}
    />
  )
}
