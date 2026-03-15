"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useRegistrationStore } from "@/src/features/auth/stores/registration-store"
import {
  roleSelectionSchema,
  VALID_ROLES,
  type RoleSelectionValues,
} from "@/src/features/auth/schemas/registration-schemas"
import { cn } from "@/lib/utils"
import {
  PenLine,
  Search,
  BookOpen,
  GraduationCap,
} from "lucide-react"

const ROLE_OPTIONS = [
  {
    value: "author" as const,
    label: "Author",
    description: "Submit manuscripts for publication in journals.",
    icon: PenLine,
  },
  {
    value: "reviewer" as const,
    label: "Reviewer",
    description: "Provide peer review feedback on submitted manuscripts.",
    icon: Search,
  },
  {
    value: "editor" as const,
    label: "Editor",
    description: "Manage editorial workflow and publication decisions.",
    icon: BookOpen,
  },
  {
    value: "reader" as const,
    label: "Reader",
    description: "Access and read published articles and journals.",
    icon: GraduationCap,
  },
]

export function StepRoleSelection() {
  const { roleSelection, setRoleSelection, nextStep, prevStep, markStepCompleted } =
    useRegistrationStore()

  const form = useForm<RoleSelectionValues>({
    resolver: zodResolver(roleSelectionSchema),
    defaultValues: roleSelection,
  })

  const selectedRole = form.watch("primaryRole")

  const onSubmit = (values: RoleSelectionValues) => {
    setRoleSelection(values)
    markStepCompleted(2)
    nextStep()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-semibold">Select Your Role</h2>
          <p className="text-sm text-muted-foreground">
            Choose your primary role on the platform. You can have additional
            roles assigned later.
          </p>
        </div>

        <FormField
          control={form.control}
          name="primaryRole"
          render={({ field }) => (
            <FormItem>
              <FormLabel id="primary-role-label" className="sr-only">Primary Role</FormLabel>
              <FormControl>
                <div
                  className="grid gap-3 sm:grid-cols-2"
                  role="radiogroup"
                  aria-labelledby="primary-role-label"
                >
                  {ROLE_OPTIONS.map((role) => {
                    const Icon = role.icon
                    const isSelected = field.value === role.value

                    return (
                      <div
                        key={role.value}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => field.onChange(role.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            field.onChange(role.value)
                          }
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all duration-200 cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-muted hover:border-muted-foreground/30 hover:bg-muted/50"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p
                            className={cn(
                              "text-sm font-semibold",
                              isSelected && "text-primary"
                            )}
                          >
                            {role.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
