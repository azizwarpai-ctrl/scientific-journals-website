"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { useJournalRegistrationStore } from "../../stores/journal-registration-store"
import {
  journalInfoSchema,
  type JournalInfoValues,
} from "../../schemas/journal-registration-schemas"

export function StepJournalInfo() {
  const { journalInfo, setJournalInfo, nextStep, prevStep, markStepCompleted } =
    useJournalRegistrationStore()

  const form = useForm<JournalInfoValues>({
    resolver: zodResolver(journalInfoSchema),
    defaultValues: journalInfo,
  })

  const onSubmit = (values: JournalInfoValues) => {
    setJournalInfo(values)
    markStepCompleted(1)
    nextStep()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold">2. Journal Information</h2>
          <p className="text-sm text-muted-foreground">
            Core metadata identifying the journal system.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Journal Title *</FormLabel>
                <FormControl>
                  <Input placeholder="International Journal of Science" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Abbreviation *</FormLabel>
                <FormControl>
                  <Input placeholder="IJS" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="printIssn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Print ISSN</FormLabel>
                <FormControl>
                  <Input placeholder="1234-5678" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="onlineIssn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Online ISSN</FormLabel>
                <FormControl>
                  <Input placeholder="1234-567X" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormDescription className="text-xs">At least one ISSN must be provided.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="discipline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Discipline *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Medical Sciences, Engineering..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Journal Description *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Outline the scope, aims, and major focus of the publication..." 
                  className="min-h-[120px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={prevStep}>
            Back
          </Button>
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Form>
  )
}
