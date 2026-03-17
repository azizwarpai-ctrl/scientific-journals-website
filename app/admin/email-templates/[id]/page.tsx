"use client"

import { use } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useGetEmailTemplate } from "@/src/features/email-templates/api/use-get-email-template"
import { EditTemplateForm } from "@/src/features/email-templates/components/edit-template-form"
import type { EmailTemplate } from "@/src/features/email-templates/types/email-template-type"

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, isError } = useGetEmailTemplate(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !data || !data.data) {
    return (
      <div className="flex items-center justify-center py-12 flex-col gap-4">
        <p className="text-muted-foreground">Template not found or failed to load.</p>
        <Button variant="outline" asChild>
          <Link href="/admin/email-templates">Back to Templates</Link>
        </Button>
      </div>
    )
  }

  const template = data.data as EmailTemplate

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/email-templates">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Template</h1>
          <p className="text-muted-foreground font-mono">{template.name}</p>
        </div>
      </div>

      <EditTemplateForm template={template} />
    </div>
  )
}
