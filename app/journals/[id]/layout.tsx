import type { Metadata } from "next"

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

  return {
    alternates: {
      canonical: buildCanonical(`/journals/${canonicalId}`),
    },
  }
}

export default function JournalSegmentLayout({ children }: LayoutProps) {
  return children
}
