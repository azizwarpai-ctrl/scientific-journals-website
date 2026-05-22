import { JournalDetailView } from "@/app/journals/[id]/journal-detail-view"

// `/journals/[id]` is the journal landing page — the About tab. The other
// tabs (Author Guidelines, Current Issue, Archive, Policies) are served by
// the sibling catch-all route `[id]/[...tab]/page.tsx`.
export default function JournalDetailPage() {
  return <JournalDetailView initialTab="about" />
}
