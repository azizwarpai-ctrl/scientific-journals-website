"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  termsAgreementsSchema,
  type TermsAgreementsValues,
} from "../../schemas/journal-registration-schemas"
import Link from "next/link"

export function StepTermsAgreements() {
  const { termsAgreements, setTermsAgreements, nextStep, prevStep, markStepCompleted } =
    useJournalRegistrationStore()

  const form = useForm<TermsAgreementsValues>({
    resolver: zodResolver(termsAgreementsSchema),
    defaultValues: termsAgreements,
  })

  const onSubmit = (values: TermsAgreementsValues) => {
    setTermsAgreements(values)
    markStepCompleted(5)
    nextStep()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold">6. Platform Agreements</h2>
          <p className="text-sm text-muted-foreground">
            Please review and accept our institutional policies.
          </p>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="ethicsConfirmation"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Publishing Ethics Confirmation *
                  </FormLabel>
                  <FormDescription>
                    I confirm that this journal adheres to the Core Practices of the Committee on Publication Ethics (COPE) or equivalent international standards.
                  </FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="copyrightAcceptance"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Copyright and Licensing Terms *
                  </FormLabel>
                  <FormDescription>
                    I understand that authors will retain copyright (for OA) or transfer copyright as defined by the journal's explicit policies.
                  </FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="platformPolicy"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Digitopub Platform Agreement *
                  </FormLabel>
                  <FormDescription>
                    I agree to the <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for hosting this journal on Digitopub infrastructure.
                  </FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>

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
