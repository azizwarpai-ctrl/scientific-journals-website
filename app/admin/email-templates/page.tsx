"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Mail, Plus, Pencil, Trash2, MailCheck, MailX } from "lucide-react"
import { toast } from "sonner"

import { useGetEmailTemplates } from "@/src/features/email-templates/api/use-get-email-templates"
import { useGetEmailStatus } from "@/src/features/email-templates/api/use-get-email-status"
import { useDeleteEmailTemplate } from "@/src/features/email-templates/api/use-delete-email-template"
import { useUpdateEmailTemplate } from "@/src/features/email-templates/api/use-update-email-template"
import type { EmailTemplate } from "@/src/features/email-templates/types/email-template-type"

export default function EmailTemplatesPage() {
  const limit = 20
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: templatesData, isLoading: loading } = useGetEmailTemplates(page, limit)
  const templates = templatesData?.data || []
  const pagination = templatesData?.pagination || null
  
  const { data: smtpStatus } = useGetEmailStatus()
  const deleteMutation = useDeleteEmailTemplate()
  const updateMutation = useUpdateEmailTemplate()

  const handleDelete = () => {
    if (!deleteId || deleteMutation.isPending) return
    
    deleteMutation.mutate({ id: deleteId }, {
      onSuccess: () => setDeleteId(null)
    })
  }

  const handleToggleActive = (template: EmailTemplate) => {
    if (updateMutation.isPending) return

    updateMutation.mutate({
      param: { id: template.id.toString() },
      json: { is_active: !template.is_active },
    })
  }

  const filteredTemplates = templates.filter((t: EmailTemplate) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "active") return matchesSearch && t.is_active
    if (activeTab === "inactive") return matchesSearch && !t.is_active
    return matchesSearch
  })

  const activeCount = templates.filter((t: EmailTemplate) => t.is_active).length
  const inactiveCount = templates.filter((t: EmailTemplate) => !t.is_active).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">Manage reusable email templates for the platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/email-templates/logs">
              View Logs
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/email-templates/new">
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Link>
          </Button>
        </div>
      </div>

      {/* Status & Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination?.totalItems || templates.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This page &mdash; Active</CardTitle>
            <MailCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This page &mdash; Inactive</CardTitle>
            <MailX className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMTP Status</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {smtpStatus ? (
                <Badge variant={smtpStatus.smtpConfigured ? "default" : "secondary"}>
                  {smtpStatus.smtpConfigured ? "Connected" : "Not Configured"}
                </Badge>
              ) : (
                <Badge variant="secondary">Checking...</Badge>
              )}
            </div>
            {smtpStatus?.provider && smtpStatus.smtpConfigured && (
              <p className="text-xs text-muted-foreground mt-1">{smtpStatus.provider}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Template List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Templates</CardTitle>
              <CardDescription>Browse and manage email templates</CardDescription>
            </div>
            <Input
              className="w-64"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>

            {["all", "active", "inactive"].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {loading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading templates...</div>
                ) : filteredTemplates.length > 0 ? (
                  filteredTemplates.map((template: EmailTemplate) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium font-mono text-sm">{template.name}</p>
                          <Badge variant={template.is_active ? "default" : "secondary"}>
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">{template.subject}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {template.variables && (template.variables as string[]).length > 0 && (
                            <span>
                              Variables:{" "}
                              {(template.variables as string[]).map((v) => `{{${v}}}`).join(", ")}
                            </span>
                          )}
                          <span>
                            Updated: {new Date(template.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(template)}
                        >
                          {template.is_active ? (
                            <MailX className="h-4 w-4" />
                          ) : (
                            <MailCheck className="h-4 w-4" />
                          )}
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/email-templates/${template.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No email templates found
                  </div>
                )}

                {/* Pagination Controls */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasPrev}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!pagination.hasNext}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
