"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Trash2, Edit, ArrowUp, ArrowDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertBanner } from "@/components/ui/alert-banner"
import { Switch } from "@/components/ui/switch"

import { 
  useGetAboutSections, 
  useCreateAboutSection, 
  useUpdateAboutSection,
  useDeleteAboutSection,
  useReorderAboutSections,
  aboutSectionSchema, 
  type AboutSection 
} from "@/src/features/about"

export default function AdminAboutPage() {
  const { data: sections, isLoading, error: loadError } = useGetAboutSections(true)
  const createMutation = useCreateAboutSection()
  const updateMutation = useUpdateAboutSection()
  const deleteMutation = useDeleteAboutSection()
  const reorderMutation = useReorderAboutSections()

  const [editSection, setEditSection] = useState<AboutSection | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<AboutSection>({
    resolver: zodResolver(aboutSectionSchema) as any,
    defaultValues: {
      block_type: "HERO",
      title: "",
      subtitle: "",
      content: "",
      display_order: 0,
      is_active: true,
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Watch block type to render conditional fields
  const currentBlockType = form.watch("block_type")

  const handleOpenNew = () => {
    form.reset({
      block_type: "HERO",
      title: "",
      subtitle: "",
      content: "",
      display_order: sections ? sections.length : 0,
      is_active: true,
      items: [],
    })
    setEditSection(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (section: AboutSection) => {
    form.reset(section)
    setEditSection(section)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string | number | undefined) => {
    if (!id) return
    if (confirm("Are you sure you want to delete this section?")) {
      deleteMutation.mutate({ id })
    }
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (!sections) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === sections.length - 1) return

    const newSections = [...sections]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    
    // Swap and update display_order
    const temp = newSections[index]
    newSections[index] = newSections[swapIndex]
    newSections[swapIndex] = temp

    const reordered = newSections.map((s, i) => ({
      id: s.id as string | number,
      display_order: i
    }))

    reorderMutation.mutate(reordered)
  }

  const onSubmit = (values: AboutSection) => {
    if (editSection?.id) {
      updateMutation.mutate({ id: editSection.id, json: values }, {
        onSuccess: () => setIsDialogOpen(false)
      })
    } else {
      createMutation.mutate(values, {
        onSuccess: () => setIsDialogOpen(false)
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">About Page Content</h1>
          <p className="text-muted-foreground">
            Manage dynamic sections displayed on the public About page.
          </p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      {loadError && (
        <AlertBanner variant="error" message="Failed to load about page content." />
      )}

      <div className="space-y-4">
        {(!sections || sections.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No sections found. Add a section to get started.
            </CardContent>
          </Card>
        )}

        {sections?.map((section, index) => (
          <Card key={section.id?.toString()} className={!section.is_active ? "opacity-60" : ""}>
            <CardHeader className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => handleMove(index, 'up')}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === sections.length - 1} onClick={() => handleMove(index, 'down')}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded font-mono uppercase">
                        {section.block_type}
                      </span>
                      {section.title || "(Untitled Section)"}
                    </CardTitle>
                    <CardDescription>{section.subtitle ? section.subtitle.substring(0, 50) + "..." : "No subtitle"}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(section)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(section.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editSection ? "Edit Section" : "Add New Section"}</DialogTitle>
            <DialogDescription>
              Configure the content and layout details for this block.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="block_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!editSection}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a block type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="HERO">Hero Banner</SelectItem>
                          <SelectItem value="TEXT">Text Paragraph</SelectItem>
                          <SelectItem value="CARDS">Card Layout (e.g., Mission/Vision)</SelectItem>
                          <SelectItem value="GRID">Icon Grid (e.g., Core Values)</SelectItem>
                          <SelectItem value="STATS">Platform Statistics</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm pt-4">
                      <div className="space-y-0.5">
                        <FormLabel>Visibility</FormLabel>
                        <FormDescription>
                          Publish to visitors
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {(currentBlockType === "HERO" || currentBlockType === "TEXT" || currentBlockType === "CARDS" || currentBlockType === "GRID" || currentBlockType === "STATS") && (
                <FormField
                  control={form.control as any}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section Title</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., About Us or Our Mission" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(currentBlockType === "HERO" || currentBlockType === "STATS") && (
                <FormField
                  control={form.control as any}
                  name="subtitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtitle</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Short descriptive text below title" className="resize-none" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(currentBlockType === "TEXT") && (
                <FormField
                  control={form.control as any}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Text Content</FormLabel>
                      <FormDescription>Supports double line breaks for paragraph separation.</FormDescription>
                      <FormControl>
                        <Textarea className="min-h-[200px]" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(currentBlockType === "CARDS" || currentBlockType === "GRID") && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Dynamic Items</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ title: "", description: "", icon: "Globe", color_theme: "primary", display_order: fields.length })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  
                  {fields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No items added to this section yet.</p>
                  )}

                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-muted/30">
                        <CardTitle className="text-sm font-medium">Item {index + 1}</CardTitle>
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4 p-4">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <FormField
                          control={form.control as any}
                          name={`items.${index}.icon`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Icon (Lucide Name)</FormLabel>
                              <FormControl>
                                <Input placeholder="E.g. Target, Eye" {...field} value={field.value || ""} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <FormField
                          control={form.control as any}
                          name={`items.${index}.color_theme`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Color Theme</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || "primary"}>
                                <FormControl>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="primary">Primary</SelectItem>
                                  <SelectItem value="secondary">Secondary</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <FormField
                          control={form.control as any}
                          name={`items.${index}.title`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Item Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Item Heading" {...field} value={field.value || ""} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <FormField
                          control={form.control as any}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Item Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Item text..." className="resize-none" {...field} value={field.value || ""} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : "Save Section"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
