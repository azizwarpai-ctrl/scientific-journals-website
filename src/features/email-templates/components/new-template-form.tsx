"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { TemplateDetailsCard } from "./template-details-card"
import { EmailContentCard } from "./email-content-card"
import { TemplateVariablesCard } from "./template-variables-card"
import { TemplateActionsCard } from "./template-actions-card"
import { useCreateEmailTemplate } from "../api/use-create-email-template"
import { Form } from "@/components/ui/form"
import { extractAllVariables } from "@/src/lib/email/renderer"
import { useNewTemplateStore } from "../stores/new-template-store"
import { emailTemplateCreateSchema, type EmailTemplateCreate } from "../schemas/email-template-schema"
import { useRouter } from "next/navigation"

export function NewTemplateForm() {
  const { formData, setFormData, reset } = useNewTemplateStore()
  const router = useRouter()

  const form = useForm<EmailTemplateCreate>({
    resolver: zodResolver(emailTemplateCreateSchema) as any,
    defaultValues: formData,
  })


  // Sync form values to Zustand store for local draft saving whenever they change
  useEffect(() => {
    const subscription = form.watch((value) => {
      setFormData(value as Partial<EmailTemplateCreate>)
    })
    return () => subscription.unsubscribe()
  }, [form, setFormData])

  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)

  const { mutate: createTemplate, isPending: saving } = useCreateEmailTemplate()

  // Watch HTML and Subject to update extracted variables interactively
  const currentHtmlContent = form.watch("html_content")
  const currentSubject = form.watch("subject")

  const allVariables = useMemo(() => {
    return extractAllVariables(currentHtmlContent || "", currentSubject || "")
  }, [currentHtmlContent, currentSubject])

  // Clear preview when content changes to avoid stale previews
  useEffect(() => {
    setPreviewHtml(null)
    setPreviewSubject(null)
  }, [currentHtmlContent, currentSubject])

  const onSubmit = (values: EmailTemplateCreate) => {
    createTemplate({
      json: {
        ...values,
        variables: allVariables.length > 0 ? allVariables : undefined,
      },
    }, {
      onSuccess: () => {
        // Clear draft after successful creation
        reset()
      }
    })
  }

  const handlePreview = () => {
    let previewContent = currentHtmlContent || ""
    let previewSub = currentSubject || ""
    allVariables.forEach((v) => {
      const sampleValue = `<strong style="color:#3b82f6">[${v}]</strong>`
      previewContent = previewContent.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), sampleValue)
      previewSub = previewSub.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), `[${v}]`)
    })
    setPreviewHtml(previewContent)
    setPreviewSubject(previewSub)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <TemplateDetailsCard form={form} />
            <EmailContentCard 
              form={form} 
              previewHtml={previewHtml} 
              previewSubject={previewSubject} 
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <TemplateVariablesCard allVariables={allVariables} />
            <TemplateActionsCard 
              saving={saving} 
              handlePreview={handlePreview} 
              hasHtmlContent={!!currentHtmlContent} 
              isNew={true}
            />
          </div>
        </div>
      </form>
    </Form>
  )
}
