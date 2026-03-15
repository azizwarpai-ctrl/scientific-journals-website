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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useJournalRegistrationStore } from "../../stores/journal-registration-store"
import {
  publicationDetailsSchema,
  type PublicationDetailsValues,
} from "../../schemas/journal-registration-schemas"

export function StepPublicationDetails() {
  const { publicationDetails, setPublicationDetails, nextStep, prevStep, markStepCompleted } =
    useJournalRegistrationStore()

  const form = useForm<PublicationDetailsValues>({
    resolver: zodResolver(publicationDetailsSchema),
    defaultValues: publicationDetails,
  })

  const onSubmit = (values: PublicationDetailsValues) => {
    setPublicationDetails(values)
    markStepCompleted(3)
    nextStep()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold">4. Publication Details</h2>
          <p className="text-sm text-muted-foreground">
            Policies and frequency settings.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publication Frequency *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly (12/year)</SelectItem>
                    <SelectItem value="Quarterly">Quarterly (4/year)</SelectItem>
                    <SelectItem value="Biannually">Biannually (2/year)</SelectItem>
                    <SelectItem value="Annually">Annually (1/year)</SelectItem>
                    <SelectItem value="Continuous">Continuous Publishing</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Language *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="English">English Only</SelectItem>
                    <SelectItem value="Arabic">Arabic Only</SelectItem>
                    <SelectItem value="Bilingual">Bilingual (English/Arabic)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="peerReviewPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peer Review Policy *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select review policy" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Double-blind">Double-blind</SelectItem>
                    <SelectItem value="Single-blind">Single-blind</SelectItem>
                    <SelectItem value="Open">Open Review</SelectItem>
                    <SelectItem value="Post-publication">Post-publication</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="openAccessPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Model *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select access model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Gold">Gold Open Access (Author-Pays)</SelectItem>
                    <SelectItem value="Green">Green Open Access</SelectItem>
                    <SelectItem value="Hybrid">Hybrid (Subscription + OA Options)</SelectItem>
                    <SelectItem value="Subscription">Subscription-Based</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="publicationFee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Article Processing Charge (USD) *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  step="1"
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Enter 0 if the journal does not charge authors (Diamond OA).
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
