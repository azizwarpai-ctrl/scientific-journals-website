import { type Journal } from "@/src/features/journals"
import { AboutNavPills } from "./about-nav-pills"
import { AimsScopeSection } from "./aims-scope-section"
import { EditorialBoardSection } from "./editorial-board-section"
import { AdvisoryBoardSection } from "./advisory-board-section"
import { JournalDetailsGrid } from "./journal-details-grid"

export interface AboutTabContentProps {
  journalId: string
  journal: Journal
  activeAboutSlug: string | null
  onPillClick: (slug: string) => void
  safeAims: string | null
  safeScope: string | null
  safeAimsAndScopeCombined: string | null
}

export function AboutTabContent({
  journalId,
  journal,
  activeAboutSlug,
  onPillClick,
  safeAims,
  safeScope,
  safeAimsAndScopeCombined,
}: AboutTabContentProps) {
  return (
    <div className="space-y-10 relative">
      {/* Compact Navigation Pills for About Tab */}
      <AboutNavPills activeAboutSlug={activeAboutSlug} onPillClick={onPillClick} />

      {/* 1. Journal Overview & Aims */}
      <AimsScopeSection
        journal={journal}
        safeAims={safeAims}
        safeScope={safeScope}
        safeAimsAndScopeCombined={safeAimsAndScopeCombined}
      />

      {/* 2. Editorial Board */}
      <div id="about-editorial-board" className="pt-2 border-t border-border/30 scroll-mt-32">
        <EditorialBoardSection
          journalId={journalId}
          editorInChief={journal.editor_in_chief}
        />
      </div>

      {/* 3. Advisory Board */}
      <div id="about-advisory-board" className="pt-2 border-t border-border/30 scroll-mt-32">
        <AdvisoryBoardSection journalId={journalId} />
      </div>

      {/* 4. Technical Details Grid */}
      <JournalDetailsGrid journal={journal} />
    </div>
  )
}
