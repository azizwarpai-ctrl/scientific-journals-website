import type { Metadata } from "next"
import { cache } from "react"

import { prisma } from "@/src/lib/db/config"
import { resolveJournalOjsId } from "@/src/features/journals/server/resolve-journal"
import { buildCanonical } from "@/src/lib/seo/canonical"
import { PeriodicalJsonLd } from "@/components/seo/periodical-jsonld"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

interface JournalForSeo {
  title: string
  description: string | null
  issn: string | null
  e_issn: string | null
  publisher: string | null
}

// Single Prisma round-trip per request, reused by generateMetadata and the
// layout body for the JSON-LD payload.
const getJournalForSeo = cache(async (id: string): Promise<JournalForSeo | null> => {
  try {
    const select = {
      title: true,
      description: true,
      issn: true,
      e_issn: true,
      publisher: true,
    } as const

    const byPath = await prisma.journal.findFirst({ where: { ojs_path: id }, select })
    if (byPath) return byPath

    const byOjsId = await prisma.journal.findFirst({ where: { ojs_id: id }, select })
    if (byOjsId) return byOjsId

    if (/^\d+$/.test(id)) {
      const byId = await prisma.journal.findUnique({ where: { id: BigInt(id) }, select })
      if (byId) return byId
    }
  } catch (err) {
    console.error("[journal-layout] failed to resolve journal metadata:", err)
  }
  return null
})

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params
  const resolved = await resolveJournalOjsId(id)
  const canonicalId = resolved.found && resolved.ojsId ? resolved.ojsId : id
  const canonicalUrl = buildCanonical(`/journals/${canonicalId}`)

  const journal = await getJournalForSeo(id)
  const title = journal?.title
  const description =
    journal?.description?.replace(/<[^>]+>/g, " ").trim().slice(0, 200) || undefined

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: title
      ? {
          title,
          description,
          url: canonicalUrl,
          type: "website",
        }
      : undefined,
  }
}

export default async function JournalSegmentLayout({ children, params }: LayoutProps) {
  const { id } = await params
  const resolved = await resolveJournalOjsId(id)
  const canonicalId = resolved.found && resolved.ojsId ? resolved.ojsId : id
  const canonicalUrl = buildCanonical(`/journals/${canonicalId}`)
  const journal = await getJournalForSeo(id)

  return (
    <>
      {journal?.title && (
        <PeriodicalJsonLd
          name={journal.title}
          description={journal.description}
          url={canonicalUrl}
          issn={journal.issn}
          eIssn={journal.e_issn}
          publisher={journal.publisher}
        />
      )}
      {children}
    </>
  )
}
