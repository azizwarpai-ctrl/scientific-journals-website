"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
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
import { useJournalRegistrationStore } from "../../stores/journal-registration-store"
import {
  publisherInfoSchema,
  type PublisherInfoValues,
} from "../../schemas/journal-registration-schemas"
import { COUNTRIES } from "@/src/features/auth/components/register/countries-data"

export function StepPublisherInfo() {
  const { publisherInfo, setPublisherInfo, nextStep, markStepCompleted } =
    useJournalRegistrationStore()

  const form = useForm<PublisherInfoValues>({
    resolver: zodResolver(publisherInfoSchema),
    defaultValues: publisherInfo,
  })

  const onSubmit = (values: PublisherInfoValues) => {
    setPublisherInfo(values)
    markStepCompleted(0)
    nextStep()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold">1. Publisher Information</h2>
          <p className="text-sm text-muted-foreground">
            Provide the details of the primary publishing entity or institution.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="publisherName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publisher Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Digitopub Press" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="institution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institution / University *</FormLabel>
                <FormControl>
                  <Input placeholder="University of Science" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="publisherAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complete Address *</FormLabel>
              <FormControl>
                <Input placeholder="123 Science Park, Building A..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Official Contact Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="contact@publisher.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Publisher Website (Optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Form>
  )
}
