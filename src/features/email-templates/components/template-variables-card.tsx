import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Props {
  allVariables: string[]
}

export function TemplateVariablesCard({ allVariables }: Props) {
  return (
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
  )
}
