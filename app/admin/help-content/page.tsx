"use client"

import { useState } from "react"
import { Plus, Trash2, GripVertical, Edit } from "lucide-react"

import { HelpConfigForm } from "./config-form"
import { defaultHelpContent } from "@/src/features/help/schemas/help-schema"

import { useGetHelpCategories, useCreateHelpCategory, useUpdateHelpCategory, useDeleteHelpCategory } from "@/src/features/help/api/use-help-categories"
import { useGetHelpContent } from "@/src/features/help/api/use-get-help-content"
import { useCreateHelpTopic, useUpdateHelpTopic, useDeleteHelpTopic } from "@/src/features/help/api/use-help-topics"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"


export default function HelpContentPage() {
  const { data: categories, isLoading: isLoadingCategs } = useGetHelpCategories()
  const { data: helpConfigResp, isLoading: isLoadingConfig } = useGetHelpContent()

  const createCategory = useCreateHelpCategory()
  const updateCategory = useUpdateHelpCategory()
  const deleteCategory = useDeleteHelpCategory()

  const createTopic = useCreateHelpTopic()
  const updateTopic = useUpdateHelpTopic()
  const deleteTopic = useDeleteHelpTopic()

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [topicDialogOpen, setTopicDialogOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<any>(null)

  const [catForm, setCatForm] = useState({ id: "", title: "", slug: "" })
  const [topicForm, setTopicForm] = useState({ id: "", categoryId: "", title: "", content: "", order: 0, isActive: true })

  const handleOpenCatForm = (cat?: any) => {
    if (cat) {
      setCatForm({ id: cat.id, title: cat.title, slug: cat.slug })
    } else {
      setCatForm({ id: "", title: "", slug: "" })
    }
    setCategoryDialogOpen(true)
  }

  const handleSaveCategory = async () => {
    if (catForm.id) {
      await updateCategory.mutateAsync(
        { id: catForm.id, values: { title: catForm.title, slug: catForm.slug } },
        { onSuccess: () => setCategoryDialogOpen(false) }
      )
    } else {
      await createCategory.mutateAsync(
        { title: catForm.title, slug: catForm.slug },
        { onSuccess: () => setCategoryDialogOpen(false) }
      )
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category? All its topics will be cascadingly deleted!")) {
      await deleteCategory.mutateAsync(id)
    }
  }

  const handleOpenTopicForm = (catId: string, topic?: any) => {
    if (topic) {
      setTopicForm({ id: topic.id, categoryId: catId, title: topic.title, content: topic.content, order: topic.order, isActive: topic.is_active })
    } else {
      setTopicForm({ id: "", categoryId: catId, title: "", content: "", order: 0, isActive: true })
    }
    setTopicDialogOpen(true)
  }

  const handleSaveTopic = async () => {
    const payload = {
      categoryId: topicForm.categoryId,
      title: topicForm.title,
      content: topicForm.content,
      order: topicForm.order,
      isActive: topicForm.isActive
    }

    if (topicForm.id) {
      await updateTopic.mutateAsync(
        { id: topicForm.id, values: payload },
        { onSuccess: () => setTopicDialogOpen(false) }
      )
    } else {
      await createTopic.mutateAsync(
        payload,
        { onSuccess: () => setTopicDialogOpen(false) }
      )
    }
  }

  const handleDeleteTopic = async (id: string) => {
    if (confirm("Are you sure you want to delete this topic?")) {
      await deleteTopic.mutateAsync(id)
    }
  }

  const helpConfig = helpConfigResp || defaultHelpContent

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help Content</h1>
          <p className="text-muted-foreground">Manage help categories and topics displayed on the public Help page</p>
        </div>
        <Button onClick={() => handleOpenCatForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <Tabs defaultValue="knowledge_base" className="w-full">
        <TabsList>
          <TabsTrigger value="knowledge_base">Knowledge Base</TabsTrigger>
          <TabsTrigger value="config">Page Config</TabsTrigger>
        </TabsList>

        <TabsContent value="knowledge_base" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Categories & Topics</CardTitle>
              <CardDescription>Drag and reorder topics within categories. Configure dynamic help elements.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCategs ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : categories && categories.length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-4">
                  {categories.map((cat: any) => (
                    <AccordionItem key={cat.id} value={cat.id} className="border rounded-lg px-4 bg-muted/20">
                      <div className="flex items-center justify-between font-medium">
                        <AccordionTrigger className="hover:no-underline">
                          <span className="text-lg">{cat.title} <span className="text-sm font-normal text-muted-foreground ml-2">({cat.slug})</span></span>
                        </AccordionTrigger>
                        <div className="flex items-center gap-2 pr-4">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); handleOpenTopicForm(cat.id) }}>
                            <Plus className="h-4 w-4 mr-1" /> Add Topic
                          </Button>
                          <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); handleOpenCatForm(cat) }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={(e) => { e.preventDefault(); handleDeleteCategory(cat.id) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <AccordionContent>
                        <div className="space-y-2 pt-2 pb-4">
                          {cat.topics && cat.topics.length > 0 ? cat.topics.map((topic: any) => (
                            <div key={topic.id} className="flex items-center justify-between bg-background border p-3 rounded-md">
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                <div>
                                  <div className="flex flex-row items-center gap-2">
                                    <span className="font-semibold">{topic.title}</span>
                                    <Badge variant={topic.is_active ? "default" : "secondary"}>
                                      {topic.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-1">{topic.content}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenTopicForm(cat.id, topic)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteTopic(topic.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )) : (
                            <div className="text-muted-foreground text-sm py-2">No topics in this category yet.</div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-10 border rounded-lg border-dashed">
                  <p className="text-muted-foreground mb-4">No categories created yet.</p>
                  <Button onClick={() => handleOpenCatForm()}>Create your first Category</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Page Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingConfig ? <Skeleton className="h-64 w-full" /> : <HelpConfigForm initialData={helpConfig} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catForm.id ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={catForm.title} onChange={(e) => {
                const title = e.target.value;
                const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                setCatForm(f => ({ ...f, title, slug: f.id ? f.slug : slug }))
              }} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={catForm.slug} onChange={(e) => setCatForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
            <Button onClick={handleSaveCategory} className="w-full" disabled={createCategory.isPending || updateCategory.isPending}>
              Save Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Topic Dialog */}
      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{topicForm.id ? "Edit Topic" : "Add Topic"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={topicForm.title} onChange={(e) => setTopicForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2 flex items-center justify-between border p-3 rounded-md">
              <Label>Is Active?</Label>
              <Switch checked={topicForm.isActive} onCheckedChange={(v) => setTopicForm(f => ({ ...f, isActive: v }))} />
            </div>
            <div className="space-y-2">
              <Label>Content (Markdown supported)</Label>
              <Textarea
                className="h-48"
                value={topicForm.content}
                onChange={(e) => setTopicForm(f => ({ ...f, content: e.target.value }))}
              />
            </div>
            <Button onClick={handleSaveTopic} className="w-full" disabled={createTopic.isPending || updateTopic.isPending}>
              Save Topic
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
