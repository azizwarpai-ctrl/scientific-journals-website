"use client"

import { useState } from "react"
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

export default function NewTemplatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    subject: "",
    html_content: "",
    text_content: "",
    description: "",
    is_active: true,
  })

  // Extract variables from HTML content
  const detectedVariables = (() => {
    const matches = form.html_content.match(/\{\{(\w+)\}\}/g)
    if (!matches) return []
    const keys = matches.map((m) => m.replace(/\{\{|\}\}/g, ""))
    return [...new Set(keys)]
  })()

  // Also detect from subject
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
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject,
          html_content: form.html_content,
          text_content: form.text_content || undefined,
          description: form.description || undefined,
          is_active: form.is_active,
          variables: allVariables.length > 0 ? allVariables : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to create template")
        return
      }

      toast.success("Template created successfully")
      router.push("/admin/email-templates")
    } catch (error) {
      console.error("Error creating template:", error)
      toast.error("Failed to create template")
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = async () => {
    // Client-side preview — just do simple variable replacement with sample values
    setPreviewing(true)
    try {
      let previewContent = form.html_content
      let previewSub = form.subject
      allVariables.forEach((v) => {
        const sampleValue = `[${v}]`
        previewContent = previewContent.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), sampleValue)
        previewSub = previewSub.replace(new RegExp(`\\{\\{${v}\\}\\}`, "g"), sampleValue)
      })
      setPreviewHtml(previewContent)
      setPreviewSubject(previewSub)
    } finally {
      setPreviewing(false)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">New Email Template</h1>
          <p className="text-muted-foreground">Create a new reusable email template</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Template Details</CardTitle>
                <CardDescription>Define the template identifier and metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. welcome-email"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
                    pattern="^[a-z0-9_-]+$"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Lowercase alphanumeric with hyphens/underscores. Used as unique identifier.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of when this template is used"
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
                    placeholder="e.g. Welcome to DigitoPub, {{userName}}"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>

                <Tabs defaultValue="html" className="w-full">
                  <TabsList>
                    <TabsTrigger value="html">HTML Content *</TabsTrigger>
                    <TabsTrigger value="text">Plain Text (optional)</TabsTrigger>
                    {previewHtml && <TabsTrigger value="preview">Preview</TabsTrigger>}
                  </TabsList>

                  <TabsContent value="html" className="mt-2">
                    <Textarea
                      placeholder="<h1>Hello {{userName}}</h1><p>Welcome to our platform...</p>"
                      value={form.html_content}
                      onChange={(e) => setForm({ ...form, html_content: e.target.value })}
                      className="min-h-[300px] font-mono text-sm"
                      required
                    />
                  </TabsContent>

                  <TabsContent value="text" className="mt-2">
                    <Textarea
                      placeholder="Hello {{userName}}, Welcome to our platform..."
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
                  <p className="text-sm text-muted-foreground">
                    No variables detected. Use {"{{variableName}}"} in your content.
                  </p>
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
                  {saving ? "Saving..." : "Create Template"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handlePreview}
                  disabled={!form.html_content || previewing}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Use <code className="bg-muted px-1 rounded">{"{{variableName}}"}</code> for dynamic content</p>
                <p>• Variables are automatically detected from your HTML</p>
                <p>• Template names must be unique and use only lowercase letters, numbers, hyphens, and underscores</p>
                <p>• Inactive templates cannot be used for sending emails</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
