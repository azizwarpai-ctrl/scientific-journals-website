"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { TemplateDetailsCard } from "@/src/features/email-templates/components/template-details-card"
import { EmailContentCard } from "@/src/features/email-templates/components/email-content-card"
import { TemplateVariablesCard } from "@/src/features/email-templates/components/template-variables-card"
import { TemplateActionsCard } from "@/src/features/email-templates/components/template-actions-card"
import { SendTestEmailCard } from "@/src/features/email-templates/components/send-test-email-card"
import { useUpdateEmailTemplate } from "@/src/features/email-templates/api/use-update-email-template"
import { useSendTestEmail } from "@/src/features/email-templates/api/use-send-test-email"
import { Form } from "@/components/ui/form"
import { toast } from "sonner"
import type { EmailTemplate } from "@/src/features/email-templates/types/email-template-type"
import { extractAllVariables } from "@/src/lib/email/renderer"
import { emailTemplateUpdateSchema, type EmailTemplateUpdate } from "@/src/features/email-templates/schemas/email-template-schema"

interface Props {
  template: EmailTemplate
}

export function EditTemplateForm({ template }: Props) {
  const form = useForm<EmailTemplateUpdate>({
    resolver: zodResolver(emailTemplateUpdateSchema) as any,
    defaultValues: {

      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || "",
      description: template.description || "",
      is_active: template.is_active,
    },
  })

  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState("")

  const { mutate: updateTemplate, isPending: saving } = useUpdateEmailTemplate()
  const { mutate: sendTestEmail, isPending: sendingTest } = useSendTestEmail()

  const currentHtmlContent = form.watch("html_content")
  const currentSubject = form.watch("subject")
  const currentTextContent = form.watch("text_content")

  const allVariables = useMemo(() => {
    return extractAllVariables(currentHtmlContent || "", currentSubject || "", currentTextContent || "")
  }, [currentHtmlContent, currentSubject, currentTextContent])

  // Clear preview when content changes to avoid stale previews
  useEffect(() => {
    setPreviewHtml(null)
    setPreviewSubject(null)
  }, [currentHtmlContent, currentSubject, currentTextContent])


  const onSubmit = (values: EmailTemplateUpdate) => {
    updateTemplate({
      param: { id: String(template.id) },
      json: {
        ...values,
        variables: allVariables.length > 0 ? allVariables : undefined,
      },
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

  const handleSendTest = () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }

    const sampleVars: Record<string, string> = {}
    allVariables.forEach((v) => {
      sampleVars[v] = `[Sample ${v}]`
    })

    sendTestEmail({
      param: { id: String(template.id) },
      json: { to: testEmail, variables: sampleVars },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <TemplateDetailsCard form={form as any} />
            <EmailContentCard 
              form={form as any} 
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
            />
            <SendTestEmailCard 
              testEmail={testEmail}
              setTestEmail={setTestEmail}
              sendingTest={sendingTest}
              handleSendTest={handleSendTest}
            />
          </div>
        </div>
      </form>
    </Form>
  )
}
