import { journalData } from "@/lib/mock-data"
import { JournalDetailClient } from "@/components/site/journal-detail-client"

export async function generateStaticParams() {
  return Object.keys(journalData).map((id) => ({
    id,
  }))
}

export default async function JournalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <JournalDetailClient id={id} />
}
