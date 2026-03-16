import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DOMPurify from "dompurify"

interface Props {
  form: {
    subject: string
    html_content: string
    text_content: string
  }
  setForm: React.Dispatch<React.SetStateAction<any>>
  previewHtml: string | null
  previewSubject: string | null
}

export function EmailContentCard({ form, setForm, previewHtml, previewSubject }: Props) {
  return (
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
            value={form.subject}
            onChange={(e) => setForm((prev: any) => ({ ...prev, subject: e.target.value }))}
            required
          />
        </div>

        <Tabs defaultValue="html" className="w-full">
          <TabsList>
            <TabsTrigger value="html">HTML Content *</TabsTrigger>
            <TabsTrigger value="text">Plain Text</TabsTrigger>
            {previewHtml && <TabsTrigger value="preview">Preview</TabsTrigger>}
          </TabsList>

          <TabsContent value="html" className="mt-2">
            <Textarea
              value={form.html_content}
              onChange={(e) => setForm((prev: any) => ({ ...prev, html_content: e.target.value }))}
              className="min-h-[300px] font-mono text-sm"
              required
            />
          </TabsContent>

          <TabsContent value="text" className="mt-2">
            <Textarea
              value={form.text_content}
              onChange={(e) => setForm((prev: any) => ({ ...prev, text_content: e.target.value }))}
              className="min-h-[300px] font-mono text-sm"
            />
          </TabsContent>

          {previewHtml && (
            <TabsContent value="preview" className="mt-2">
              <div className="border rounded-lg p-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  <strong>Subject:</strong> {previewSubject}
                </div>
                <iframe
                  className="w-full min-h-[500px] border-t pt-3"
                  srcDoc={DOMPurify.sanitize(previewHtml)}
                  sandbox=""
                  title="Email Preview"
                  aria-label="Email Preview Content"
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}
