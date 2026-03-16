"use client"

import { useState, useMemo } from "react"
import { TemplateDetailsCard } from "./template-details-card"
import { EmailContentCard } from "./email-content-card"
import { TemplateVariablesCard } from "./template-variables-card"
import { TemplateActionsCard } from "./template-actions-card"
import { SendTestEmailCard } from "./send-test-email-card"
import { useUpdateEmailTemplate } from "../api/use-update-email-template"
import { useSendTestEmail } from "../api/use-send-test-email"
import { toast } from "sonner"
import type { EmailTemplate } from "../types/email-template-type"

interface Props {
  template: EmailTemplate
}

export function EditTemplateForm({ template }: Props) {
  const [form, setForm] = useState({
    name: template.name,
    subject: template.subject,
    html_content: template.html_content,
    text_content: template.text_content || "",
    description: template.description || "",
    is_active: template.is_active,
  })

  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState("")

  const { mutate: updateTemplate, isPending: saving } = useUpdateEmailTemplate()
  const { mutate: sendTestEmail, isPending: sendingTest } = useSendTestEmail()

  const allVariables = useMemo(() => {
    const htmlMatches = form.html_content.match(/\{\{(\w+)\}\}/g) || []
    const subjectMatches = form.subject.match(/\{\{(\w+)\}\}/g) || []
    
    const htmlKeys = htmlMatches.map((m) => m.replace(/\{\{|\}\}/g, ""))
    const subjectKeys = subjectMatches.map((m) => m.replace(/\{\{|\}\}/g, ""))
    
    return [...new Set([...htmlKeys, ...subjectKeys])]
  }, [form.html_content, form.subject])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.subject || !form.html_content) {
      toast.error("Please fill in all required fields")
      return
    }

    updateTemplate({
      param: { id: String(template.id) },
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
  )
}
