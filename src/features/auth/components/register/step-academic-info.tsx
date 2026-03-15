"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useRegistrationStore } from "../../stores/registration-store"
import {
  academicInfoSchema,
  type AcademicInfoValues,
} from "../../schemas/registration-schemas"

export function StepAcademicInfo() {
  const { academicInfo, setAcademicInfo, nextStep, prevStep, markStepCompleted } =
    useRegistrationStore()

  const form = useForm<AcademicInfoValues>({
    resolver: zodResolver(academicInfoSchema),
    defaultValues: academicInfo,
  })

  const onSubmit = (values: AcademicInfoValues) => {
    setAcademicInfo(values)
    markStepCompleted(1)
    nextStep()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold">
            Academic &amp; Institutional Information
          </h2>
          <p className="text-sm text-muted-foreground">
            Help us connect you with the right journals and reviewers.
          </p>
        </div>

        <FormField
          control={form.control}
          name="affiliation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Affiliation / Institution *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Massachusetts Institute of Technology"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Department of Computer Science"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="orcid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ORCID iD (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="0000-0000-0000-0000"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Your unique researcher identifier.{" "}
                <a
                  href="https://orcid.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Get an ORCID
                </a>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="biography"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Biography (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="A brief academic biography..."
                  className="min-h-[100px] resize-y"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                This will be displayed on your public profile.
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
