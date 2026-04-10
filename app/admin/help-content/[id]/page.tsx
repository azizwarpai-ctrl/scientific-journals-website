"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useGetHelpArticle, useUpdateHelpArticle, useDeleteHelpArticle } from "@/src/features/help-articles"

export default function EditHelpArticlePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { data: articleResponse, isLoading } = useGetHelpArticle(id)
  const updateMutation = useUpdateHelpArticle(id)
  const deleteMutation = useDeleteHelpArticle()

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    icon: "",
    display_order: 0,
    is_published: false,
  })

  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (articleResponse?.data && !initialized) {
      const article = articleResponse.data
      setFormData({
        title: article.title,
        content: article.content,
        category: article.category || "general",
        icon: article.icon || "",
        display_order: article.display_order,
        is_published: article.is_published,
      })
      setInitialized(true)
    }
  }, [articleResponse, initialized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    updateMutation.mutate(
      {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        icon: formData.icon || undefined,
        display_order: formData.display_order,
        is_published: formData.is_published,
      },
      {
        onSuccess: () => {
          router.push("/admin/help-content")
        },
      }
    )
  }

  const handleDelete = () => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        router.push("/admin/help-content")
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/admin/help-content">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Help Article</h1>
            <p className="text-muted-foreground">Update the help article details</p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Help Article</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this article? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Article Details</CardTitle>
            <CardDescription>Modify the help article information</CardDescription>
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
              <Label htmlFor="published">Published</Label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
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
