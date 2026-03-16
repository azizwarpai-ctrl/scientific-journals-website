import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Save, Eye, Loader2 } from "lucide-react"

interface Props {
  saving: boolean
  handlePreview: () => void
  hasHtmlContent: boolean
  isNew?: boolean
}

export function TemplateActionsCard({ saving, handlePreview, hasHtmlContent, isNew = false }: Props) {
  return (
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
          {saving ? (isNew ? "Creating..." : "Saving...") : (isNew ? "Create Template" : "Save Changes")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handlePreview}
          disabled={!hasHtmlContent}
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </CardContent>
    </Card>
  )
}
