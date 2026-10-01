import Link from "next/link"
import { Shield, FileText, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import CollapsibleContent from "@/components/ui/collapsible-content"
import { type Journal } from "@/src/features/journals"
import { PublicationFeesCard } from "./publication-fees-card"

export interface AuthorGuidelinesTabProps {
  journal: Journal
  ojsFees?: {
    html?: string | null
    publicationFee?: number | null
    submissionFee?: number | null
    currencyCode?: string | null
  } | null
  safeAuthorGuidelines: string
  submissionUrl?: string | null
}

export function AuthorGuidelinesTab({
  journal,
  ojsFees,
  safeAuthorGuidelines,
  submissionUrl,
}: AuthorGuidelinesTabProps) {
  return (
    <div className="space-y-6">
      {/* Publication Fees */}
      <PublicationFeesCard
        publicationFeeDefault={journal.publication_fee}
        submissionFeeDefault={journal.submission_fee}
        ojsFees={ojsFees}
        directUrl={submissionUrl}
      />

      {/* Author Guidelines — from OJS journal_settings.authorGuidelines */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Author Guidelines</h2>
        </div>
        <CollapsibleContent
          maxHeight={420}
          className="prose prose-slate max-w-none dark:prose-invert text-sm leading-relaxed"
        >
          {journal.author_guidelines ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed overflow-hidden">
              <div dangerouslySetInnerHTML={{ __html: safeAuthorGuidelines }} />
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">
                Detailed author guidelines are being prepared for this journal.
              </p>
            </div>
          )}
        </CollapsibleContent>

        {submissionUrl && (
          <div className="mt-8 pt-6 border-t border-border/60">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-semibold px-8 h-12 shadow-sm"
              asChild
            >
              <Link href={submissionUrl}>
                Submit Manuscript
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
