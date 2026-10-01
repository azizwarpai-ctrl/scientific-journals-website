import Link from "next/link"
import { Building, Mail } from "lucide-react"

export interface JournalContactCardProps {
  publisher?: string | null
  contactEmail?: string | null
}

export function JournalContactCard({ publisher, contactEmail }: JournalContactCardProps) {
  if (!publisher && !contactEmail) return null

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
      <h3 className="text-lg font-bold mb-5 pb-3 border-b border-border/60">Contact</h3>
      <div className="space-y-4 text-sm">
        {publisher && (
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-muted mt-0.5">
              <Building className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Publisher</span>
              <span className="font-medium">{publisher}</span>
            </div>
          </div>
        )}
        {contactEmail && (
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-muted mt-0.5">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Contact Email</span>
              <Link
                href={`mailto:${contactEmail}`}
                className="font-medium text-primary hover:underline"
              >
                {contactEmail}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
