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
} from "@/components/ui/form"
import { useJournalRegistrationStore } from "../../stores/journal-registration-store"
import {
  editorialInfoSchema,
  type EditorialInfoValues,
} from "../../schemas/journal-registration-schemas"

export function StepEditorialInfo() {
  const { editorialInfo, setEditorialInfo, nextStep, prevStep, markStepCompleted } =
    useJournalRegistrationStore()

  const form = useForm<EditorialInfoValues>({
    resolver: zodResolver(editorialInfoSchema),
    defaultValues: editorialInfo,
  })

  const onSubmit = (values: EditorialInfoValues) => {
    setEditorialInfo(values)
    markStepCompleted(2)
    nextStep()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold">3. Editorial Information</h2>
          <p className="text-sm text-muted-foreground">
            Key contacts for the editorial review process.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="editorInChief"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Editor-in-Chief Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Dr. Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="editorEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Editor Email *</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jane.doe@journal.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="editorialBoardContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Editorial Board Generic Contact Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="editorial@journal.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="editorialAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Physical Editorial Address *</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Where the editorial office is located..." 
                  className="min-h-[80px]"
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
