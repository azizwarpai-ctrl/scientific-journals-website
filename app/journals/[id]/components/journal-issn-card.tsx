export interface JournalIssnCardProps {
  issn?: string | null
  eIssn?: string | null
}

export function JournalIssnCard({ issn, eIssn }: JournalIssnCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">ISSN Information</h3>
      <div className="space-y-3">
        {issn && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/40">
            <span className="text-xs text-muted-foreground">Print ISSN</span>
            <span className="font-mono font-semibold text-sm">{issn}</span>
          </div>
        )}
        {eIssn && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border/40">
            <span className="text-xs text-muted-foreground">Online ISSN</span>
            <span className="font-mono font-semibold text-sm">{eIssn}</span>
          </div>
        )}
        {!issn && !eIssn && (
          <p className="text-sm text-muted-foreground">ISSN information coming soon</p>
        )}
      </div>
    </div>
  )
}
