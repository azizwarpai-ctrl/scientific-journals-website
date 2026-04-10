"use client"

import { useState } from "react"
import { useUpdateHelpContent } from "@/src/features/help/api/use-update-help-content"
import type { HelpContent, QuickLink } from "@/src/features/help/schemas/help-schema"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, GripVertical } from "lucide-react"

export function HelpConfigForm({ initialData }: { initialData: HelpContent }) {
  const [formData, setFormData] = useState<HelpContent>(initialData)
  const mutation = useUpdateHelpContent()

  const handleUpdate = () => {
    mutation.mutate(formData)
  }

  const addQuickLink = () => {
    const newLink: QuickLink = {
      id: Math.random().toString(36).substring(7),
      title: "New Link",
      description: "Description",
      href: "/",
      icon: "Link",
      color: "primary",
    }
    setFormData({ ...formData, quickLinks: [...formData.quickLinks, newLink] })
  }

  const updateQuickLink = (index: number, updates: Partial<QuickLink>) => {
    const newLinks = [...formData.quickLinks]
    newLinks[index] = { ...newLinks[index], ...updates }
    setFormData({ ...formData, quickLinks: newLinks })
  }

  const removeQuickLink = (index: number) => {
    const newLinks = [...formData.quickLinks]
    newLinks.splice(index, 1)
    setFormData({ ...formData, quickLinks: newLinks })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hero Configuration</CardTitle>
          <CardDescription>Update the primary text displayed at the top of the Help page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">Hero Title</Label>
            <Input
              id="heroTitle"
              value={formData.heroTitle}
              onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
            <Input
              id="heroSubtitle"
              value={formData.heroSubtitle}
              onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Manage the quick access shortcuts rendered below the Hero section.</CardDescription>
          </div>
          <Button type="button" onClick={addQuickLink} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Add Link
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.quickLinks.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">No quick links configured.</div>
          )}
          {formData.quickLinks.map((link, idx) => (
            <div key={link.id || idx} className="flex gap-4 items-start border p-4 rounded-md bg-muted/20">
              <div className="grid flex-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={link.title} onChange={(e) => updateQuickLink(idx, { title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={link.description} onChange={(e) => updateQuickLink(idx, { description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>URL (href)</Label>
                  <Input value={link.href} onChange={(e) => updateQuickLink(idx, { href: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lucide Icon</Label>
                    <Input value={link.icon} onChange={(e) => updateQuickLink(idx, { icon: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Color Style</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={link.color}
                      onChange={(e) => updateQuickLink(idx, { color: e.target.value as "primary" | "secondary" })}
                    >
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                    </select>
                  </div>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive mt-6" onClick={() => removeQuickLink(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-end border-t pt-6 bg-muted/10">
          <Button onClick={handleUpdate} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
