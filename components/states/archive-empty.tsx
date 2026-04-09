import { Archive, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function ArchiveEmpty({
  message = "This journal doesn't have any past published issues yet. Check back soon for archived content.",
}: {
  message?: string
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-muted p-3.5 rounded-full mb-5">
          <Archive className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Archived Issues</h3>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          {message}
        </p>

      </div>
    </div>
  )
}
