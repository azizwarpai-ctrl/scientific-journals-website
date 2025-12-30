import { journalNames } from "@/lib/mock-data"
import { JournalLoginClient } from "@/components/site/journal-login-client"

export async function generateStaticParams() {
  return Object.keys(journalNames).map((id) => ({
    id,
  }))
}

export default async function JournalLoginPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <JournalLoginClient id={id} />
}
