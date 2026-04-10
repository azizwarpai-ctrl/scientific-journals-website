import { FileQuestion, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function GenericNotFound({
  title = "Page Not Found",
  message = "The page you are looking for doesn't exist or has been moved.",
}: {
  title?: string
  message?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="bg-muted p-4 rounded-full mb-6">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-8">{message}</p>
      <Button asChild variant="outline">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>
    </div>
  )
}

export function JournalNotFound() {
  return (
    <div className="container mx-auto px-4 py-20">
      <GenericNotFound 
        title="Journal Not Found"
        message="The journal you are looking for does not exist or has been removed from our database."
      />
      <div className="mt-8 flex justify-center">
        <Button asChild>
          <Link href="/journals">Browse All Journals</Link>
        </Button>
      </div>
    </div>
  )
}
