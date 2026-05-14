import type { Metadata } from "next"

import { prisma } from "@/src/lib/db/config"
import { resolveJournalOjsId } from "@/src/features/journals/server/resolve-journal"
import { buildCanonical } from "@/src/lib/seo/canonical"

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params
  const resolved = await resolveJournalOjsId(id)
  const canonicalId = resolved.found && resolved.ojsId ? resolved.ojsId : id
  const canonicalUrl = buildCanonical(`/journals/${canonicalId}`)

  // Fetch the journal record so the title/description in <head> reflects the
  // journal, not the generic "Scientific Journals" set on the listing layout.
  let title: string | undefined
  let description: string | undefined
  try {
    const lookups = [
      resolved.found && resolved.prismaId
        ? prisma.journal.findUnique({ where: { id: resolved.prismaId } })
        : null,
      prisma.journal.findFirst({ where: { ojs_path: id } }),
      resolved.found && resolved.ojsId
        ? prisma.journal.findFirst({ where: { ojs_id: resolved.ojsId } })
        : null,
    ].filter(Boolean) as Promise<{ title: string; description: string | null } | null>[]

    for (const lookup of lookups) {
      const journal = await lookup
      if (journal?.title) {
        title = journal.title
        description = journal.description?.replace(/<[^>]+>/g, " ").trim().slice(0, 200) || undefined
        break
      }
    }
  } catch (err) {
    console.error("[journal-layout] failed to resolve journal metadata:", err)
  }

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

export default function JournalSegmentLayout({ children }: LayoutProps) {
  return children
}
