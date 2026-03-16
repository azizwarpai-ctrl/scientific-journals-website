import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface Props {
  form: {
    name: string
    description: string
    is_active: boolean
  }
  setForm: React.Dispatch<React.SetStateAction<any>>
}

export function TemplateDetailsCard({ form, setForm }: Props) {
  return (
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
              setForm((prev: any) => ({
                ...prev,
                name: e.target.value,
              }))
            }
            onBlur={(e) =>
              setForm((prev: any) => ({
                ...prev,
                name: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
              }))
            }
            required
          />
          <p className="text-xs text-muted-foreground">Lowercase alphanumeric with hyphens/underscores only.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => setForm((prev: any) => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="is_active">Active</Label>
          <Switch
            id="is_active"
            checked={form.is_active}
            onCheckedChange={(checked) => setForm((prev: any) => ({ ...prev, is_active: checked }))}
          />
        </div>
      </CardContent>
    </Card>
  )
}
