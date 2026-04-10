"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewHelpArticlePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    icon: "",
    display_order: 0,
    is_published: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/help-articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          icon: formData.icon || undefined,
          display_order: formData.display_order,
          is_published: formData.is_published,
        }),
      })

      setIsSubmitting(false)

      if (!response.ok) {
        const error = await response.json()
        console.error("Error creating help article:", error)
        alert("Failed to create help article. Please try again.")
      } else {
        router.push("/admin/help-content")
      }
    } catch (error) {
      setIsSubmitting(false)
      console.error("Error creating help article:", error)
      alert("Failed to create help article. Please try again.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/admin/help-content">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Help Article</h1>
          <p className="text-muted-foreground">Add a new help article to the public Help page</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Article Details</CardTitle>
            <CardDescription>Fill in the information for the new help article</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter the article title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write the article content..."
                className="min-h-52"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="getting-started">Getting Started</SelectItem>
                    <SelectItem value="submission">Submission</SelectItem>
                    <SelectItem value="publication">Publication</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  min={0}
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon Name (optional)</Label>
              <Input
                id="icon"
                placeholder="e.g., BookOpen, FileText, HelpCircle"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Enter a Lucide icon name for visual display</p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="published">Publish immediately</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Article"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/help-content">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
