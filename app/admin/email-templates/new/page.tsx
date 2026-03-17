import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { NewTemplateForm } from "@/src/features/email-templates/components/new-template-form"

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/email-templates" aria-label="Back to email templates">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Email Template</h1>
          <p className="text-muted-foreground">Create a new reusable email template</p>
        </div>
      </div>

      <NewTemplateForm />
    </div>
  )
}
