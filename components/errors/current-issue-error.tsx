import { AlertCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CurrentIssueError({
  message = "We couldn't load the current issue. This could be due to a temporary connection issue.",
  retry,
}: {
  message?: string
  retry?: () => void
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-destructive/10 p-3.5 rounded-full mb-5">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Failed to Load Current Issue
        </h3>
        <p className="text-muted-foreground text-sm max-w-md mb-6">
          {message}
        </p>
        {retry && (
          <Button onClick={retry} variant="outline" size="sm">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}
