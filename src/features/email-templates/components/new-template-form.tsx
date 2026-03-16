"use client"

import { useState, useMemo } from "react"
import { TemplateDetailsCard } from "./template-details-card"
import { EmailContentCard } from "./email-content-card"
import { TemplateVariablesCard } from "./template-variables-card"
import { TemplateActionsCard } from "./template-actions-card"
import { useCreateEmailTemplate } from "../api/use-create-email-template"
import { toast } from "sonner"
import { extractAllVariables } from "@/src/lib/email/renderer"

export function NewTemplateForm() {
  const [form, setForm] = useState({
    name: "",
    subject: "",
    html_content: "",
    text_content: "",
    description: "",
    is_active: true,
  })

  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)

  const { mutate: createTemplate, isPending: saving } = useCreateEmailTemplate()

  const allVariables = useMemo(() => {
    return extractAllVariables(form.html_content, form.subject)
  }, [form.html_content, form.subject])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.subject || !form.html_content) {
      toast.error("Please fill in all required fields")
      return
    }

    createTemplate({
      json: {
        name: form.name,
        subject: form.subject,
        html_content: form.html_content,
        text_content: form.text_content || undefined,
        description: form.description || undefined,
        is_active: form.is_active,
        variables: allVariables.length > 0 ? allVariables : undefined,
      },
    })
  }

  const handlePreview = () => {
    let previewContent = form.html_content
    let previewSub = form.subject
    allVariables.forEach((v) => {
      const sampleValue = `<strong style="color:#3b82f6">[${v}]</strong>`
      previewContent = previewContent.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), sampleValue)
      previewSub = previewSub.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), `[${v}]`)
    })
    setPreviewHtml(previewContent)
    setPreviewSubject(previewSub)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <TemplateDetailsCard form={form} setForm={setForm} />
          <EmailContentCard 
            form={form} 
            setForm={setForm} 
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
            hasHtmlContent={!!form.html_content} 
            isNew={true}
          />
        </div>
      </div>
    </form>
  )
}
