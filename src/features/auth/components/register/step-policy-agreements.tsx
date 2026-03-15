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
} from "@/components/ui/form"
import { useRegistrationStore } from "@/src/features/auth/stores/registration-store"
import {
  policyAgreementsSchema,
  type PolicyAgreementsValues,
} from "@/src/features/auth/schemas/registration-schemas"

const POLICIES = [
  {
    name: "termsOfService" as const,
    label: "Terms of Service",
    description:
      "I agree to the DigitoPub Terms of Service, including the rules governing platform usage, user responsibilities, and account management.",
  },
  {
    name: "privacyPolicy" as const,
    label: "Privacy Policy",
    description:
      "I acknowledge that my data will be processed in accordance with the DigitoPub Privacy Policy, including how personal information is collected, stored, and used.",
  },
  {
    name: "publishingEthics" as const,
    label: "Publishing Ethics Statement",
    description:
      "I agree to adhere to recognized standards of publishing ethics (COPE guidelines), including proper authorship attribution, originality of work, avoidance of plagiarism, and responsible conduct of research.",
  },
]

export function StepPolicyAgreements() {
  const {
    policyAgreements,
    setPolicyAgreements,
    nextStep,
    prevStep,
    markStepCompleted,
  } = useRegistrationStore()

  const form = useForm<PolicyAgreementsValues>({
    resolver: zodResolver(policyAgreementsSchema),
    defaultValues: policyAgreements,
  })

  const onSubmit = (values: PolicyAgreementsValues) => {
    setPolicyAgreements(values)
    markStepCompleted(3)
    nextStep()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold">Terms &amp; Agreements</h2>
          <p className="text-sm text-muted-foreground">
            Please review and accept the following agreements to continue.
          </p>
        </div>

        <div className="space-y-4">
          {POLICIES.map((policy) => (
            <FormField
              key={policy.name}
              control={form.control}
              name={policy.name}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md bg-background">
                  <FormControl>
                    <Checkbox
                      id={policy.name}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor={policy.name} className="text-base font-semibold cursor-pointer">
                      {policy.label}
                    </FormLabel>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {policy.description}
                    </p>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          ))}
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
