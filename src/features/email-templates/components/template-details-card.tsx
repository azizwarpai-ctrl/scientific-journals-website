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
import type { FieldValues, UseFormReturn, Path } from "react-hook-form"

interface Props<T extends FieldValues> {
  form: UseFormReturn<T>
}


export function TemplateDetailsCard<T extends FieldValues>({
  form
}: Props<T>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Details</CardTitle>
        <CardDescription>Edit the template identifier and metadata</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name={"name" as Path<T>}
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
          name={"description" as Path<T>}
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
          name={"is_active" as Path<T>}
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
