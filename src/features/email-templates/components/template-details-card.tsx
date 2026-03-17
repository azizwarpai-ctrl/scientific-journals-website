import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import type { UseFormReturn } from "react-hook-form"
import type { EmailTemplateFormValues } from "@/src/features/email-templates/schemas/email-template-schema"

interface Props {
  form: UseFormReturn<any>
}


export function TemplateDetailsCard({ form }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Details</CardTitle>
        <CardDescription>Edit the template identifier and metadata</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name *</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onBlur={(e) => {
                    field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                  }}
                  placeholder="e.g. welcome-email"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Lowercase alphanumeric with hyphens/underscores only.</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="Brief description of when this template is used" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Active</FormLabel>
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
      </CardContent>
    </Card>
  )
}
