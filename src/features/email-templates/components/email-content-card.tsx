import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DOMPurify from "dompurify"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { FieldValues, UseFormReturn, Path } from "react-hook-form"

interface Props<T extends FieldValues> {
  form: UseFormReturn<T>
  previewHtml: string | null
  previewSubject: string | null
}


export function EmailContentCard<T extends FieldValues>({
  form,
  previewHtml,
  previewSubject
}: Props<T>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Content</CardTitle>
        <CardDescription>
          Use {"{{variableName}}"} syntax for dynamic content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name={"subject" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Welcome to DigitoPub, {{userName}}" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Tabs defaultValue="html" className="w-full">
          <TabsList>
            <TabsTrigger value="html">HTML Content *</TabsTrigger>
            <TabsTrigger value="text">Plain Text</TabsTrigger>
            {previewHtml && <TabsTrigger value="preview">Preview</TabsTrigger>}
          </TabsList>

          <TabsContent value="html" className="mt-2">
            <FormField
              control={form.control}
              name={"html_content" as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="<h1>Hello {{userName}}</h1><p>Welcome to our platform...</p>"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="text" className="mt-2">
            <FormField
              control={form.control}
              name={"text_content" as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="Hello {{userName}}, Welcome to our platform..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
