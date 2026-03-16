"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Eye, Send, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content: string | null
  variables: string[] | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState("")

  const [form, setForm] = useState({
    name: "",
    subject: "",
    html_content: "",
    text_content: "",
    description: "",
    is_active: true,
  })

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/email-templates/${id}`)
      if (!res.ok) {
        toast.error("Template not found")
        router.push("/admin/email-templates")
        return
      }
      const data = await res.json()
      const template: EmailTemplate = data.data
      setForm({
        name: template.name,
        subject: template.subject,
        html_content: template.html_content,
        text_content: template.text_content || "",
        description: template.description || "",
        is_active: template.is_active,
      })
    } catch (error) {
      console.error("Error fetching template:", error)
      toast.error("Failed to load template")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  // Extract variables from HTML content
  const detectedVariables = (() => {
    const matches = form.html_content.match(/\{\{(\w+)\}\}/g)
    if (!matches) return []
    const keys = matches.map((m) => m.replace(/\{\{|\}\}/g, ""))
    return [...new Set(keys)]
  })()

  const subjectVariables = (() => {
    const matches = form.subject.match(/\{\{(\w+)\}\}/g)
    if (!matches) return []
    const keys = matches.map((m) => m.replace(/\{\{|\}\}/g, ""))
    return [...new Set(keys)]
  })()

  const allVariables = [...new Set([...detectedVariables, ...subjectVariables])]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.subject || !form.html_content) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setSaving(true)
      const res = await fetch(`/api/email-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject,
          html_content: form.html_content,
          text_content: form.text_content || null,
          description: form.description || null,
          is_active: form.is_active,
          variables: allVariables.length > 0 ? allVariables : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to update template")
        return
      }

      toast.success("Template updated successfully")
    } catch (error) {
      console.error("Error updating template:", error)
      toast.error("Failed to update template")
    } finally {
      setSaving(false)
    }
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

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }

    try {
      setSendingTest(true)
      // Build sample variables
      const sampleVars: Record<string, string> = {}
      allVariables.forEach((v) => {
        sampleVars[v] = `[Sample ${v}]`
      })

      const res = await fetch(`/api/email-templates/${id}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail, variables: sampleVars }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to send test email")
        return
      }

      toast.success("Test email sent!")
    } catch (error) {
      console.error("Error sending test:", error)
      toast.error("Failed to send test email")
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
          <p className="text-muted-foreground font-mono">{form.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
                <CardDescription>Edit the template identifier and metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Active</Label>
                  <Switch
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Content</CardTitle>
                <CardDescription>
                  Use {"{{variableName}}"} syntax for dynamic content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>

                <Tabs defaultValue="html" className="w-full">
                  <TabsList>
                    <TabsTrigger value="html">HTML Content *</TabsTrigger>
                    <TabsTrigger value="text">Plain Text</TabsTrigger>
                    {previewHtml && <TabsTrigger value="preview">Preview</TabsTrigger>}
                  </TabsList>

                  <TabsContent value="html" className="mt-2">
                    <Textarea
                      value={form.html_content}
                      onChange={(e) => setForm({ ...form, html_content: e.target.value })}
                      className="min-h-[300px] font-mono text-sm"
                      required
                    />
                  </TabsContent>

                  <TabsContent value="text" className="mt-2">
                    <Textarea
                      value={form.text_content}
                      onChange={(e) => setForm({ ...form, text_content: e.target.value })}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </TabsContent>

                  {previewHtml && (
                    <TabsContent value="preview" className="mt-2">
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="text-sm text-muted-foreground">
                          <strong>Subject:</strong> {previewSubject}
                        </div>
                        <div
                          className="border-t pt-3"
                          dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detected Variables</CardTitle>
              </CardHeader>
              <CardContent>
                {allVariables.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allVariables.map((v) => (
                      <Badge key={v} variant="outline" className="font-mono text-xs">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No variables detected.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handlePreview}
                  disabled={!form.html_content}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Send Test Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="recipient@example.com"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleSendTest}
                  disabled={!testEmail || sendingTest}
                >
                  {sendingTest ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {sendingTest ? "Sending..." : "Send Test"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sends a test email with sample variable values. Requires SMTP to be configured.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
