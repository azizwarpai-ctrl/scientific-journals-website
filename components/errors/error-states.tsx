import { AlertCircle, RotateCcw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function GenericError({
  message = "An unexpected error occurred. Please try again later.",
  retry,
}: {
  message?: string
  retry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="bg-destructive/10 p-4 rounded-full mb-6">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md mb-8">{message}</p>
      <div className="flex gap-4">
        {retry && (
          <Button onClick={retry} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function JournalError({ message, retry }: { message?: string; retry?: () => void }) {
  return (
    <div className="container mx-auto px-4 py-20">
      <GenericError 
        message={message || "We couldn't load the journal data. This could be due to a temporary connection issue."} 
        retry={retry} 
      />
    </div>
  )
}
