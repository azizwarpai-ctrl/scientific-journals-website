"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { TemplateDetailsCard } from "./template-details-card"
import { EmailContentCard } from "./email-content-card"
import { TemplateVariablesCard } from "./template-variables-card"
import { TemplateActionsCard } from "./template-actions-card"
import { SendTestEmailCard } from "./send-test-email-card"
import { useUpdateEmailTemplate } from "../api/use-update-email-template"
import { useSendTestEmail } from "../api/use-send-test-email"
import { Form } from "@/components/ui/form"
import { toast } from "sonner"
import type { EmailTemplate } from "../types/email-template-type"
import { extractAllVariables } from "@/src/lib/email/renderer"
import { emailTemplateUpdateSchema, type EmailTemplateUpdate } from "../schemas/email-template-schema"

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

  const allVariables = useMemo(() => {
    return extractAllVariables(currentHtmlContent || "", currentSubject || "")
  }, [currentHtmlContent, currentSubject])

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
    setPreviewSubject(previewSubject)
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
