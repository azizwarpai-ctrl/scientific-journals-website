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
  FormDescription,
} from "@/components/ui/form"
import { useJournalRegistrationStore } from "../../stores/journal-registration-store"
import {
  technicalConfigSchema,
  type TechnicalConfigValues,
} from "../../schemas/journal-registration-schemas"

export function StepTechnicalConfig() {
  const { technicalConfig, setTechnicalConfig, nextStep, prevStep, markStepCompleted } =
    useJournalRegistrationStore()

  const form = useForm<TechnicalConfigValues>({
    resolver: zodResolver(technicalConfigSchema),
    defaultValues: technicalConfig,
  })

  const onSubmit = (values: TechnicalConfigValues) => {
    setTechnicalConfig(values)
    markStepCompleted(4)
    nextStep()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold">5. Technical Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Settings for how your journal will be hosted on the OJS platform.
          </p>
        </div>

        <FormField
          control={form.control}
          name="requestedUrlPath"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Requested URL Path *</FormLabel>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                  digitopub.com/
                </span>
                <FormControl>
                  <Input 
                    {...field} 
                    className="rounded-l-none"
                    placeholder="my-journal" 
                    onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                  />
                </FormControl>
              </div>
              <FormDescription className="text-xs">
                Only lowercase letters, numbers, and hyphens (e.g., 'ij-med'). This sets your system path.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customDomain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Domain (Optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://www.myjournal.org" {...field} />
              </FormControl>
              <FormDescription className="text-xs">
                If you have purchased a custom domain, enter it here. DNS records will need pointing later.
              </FormDescription>
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
