"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react"
import { planFormSchema, type PlanFormValues, type PricingPlanCreateInput } from "../schemas/billing-schema"
import type { SerializedPricingPlan } from "../api/use-pricing-plans"
import { useGetJournals } from "@/src/features/journals/api/use-get-journals"

interface PlanFormProps {
  initialData?: SerializedPricingPlan | null
  onSubmit: (data: PricingPlanCreateInput) => Promise<unknown>
  isSubmitting?: boolean
  title?: string
}

interface FeatureItem {
  id: string
  text: string
}

let featureIdSeq = 0
function createFeatureItem(text: string): FeatureItem {
  featureIdSeq += 1
  return { id: `feat-${featureIdSeq}-${Date.now()}`, text }
}

function parseInitialFeatureStrings(features: unknown): string[] {
  if (Array.isArray(features)) {
    const list = features.map(String)
    return list.length > 0 ? list : [""]
  }
  if (features && typeof features === "object") {
    const list = Object.entries(features).reduce<string[]>((acc, [k, v]) => {
      if (v) acc.push(k)
      return acc
    }, [])
    return list.length > 0 ? list : [""]
  }
  return [""]
}

function formatToLocalDateTimeString(dateVal?: unknown): string {
  if (!dateVal) return ""
  const d = new Date(String(dateVal))
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => n.toString().padStart(2, "0")
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// ── FeatureListEditor ─────────────────────────────────────────────────────────
interface FeatureListEditorProps {
  features: FeatureItem[]
  onChange: (id: string, value: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  error?: string
}

function FeatureListEditor({ features, onChange, onAdd, onRemove, error }: FeatureListEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold">Included Features</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Feature
        </Button>
      </div>

      <div className="space-y-2.5">
        {features.map((feature, idx) => (
          <div key={feature.id} className="flex items-center gap-2">
            <Input
              value={feature.text}
              placeholder={`Feature ${idx + 1}`}
              onChange={(e) => onChange(feature.id, e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(feature.id)}
              disabled={features.length <= 1}
              className="text-muted-foreground hover:text-destructive"
              aria-label={`Remove feature ${idx + 1}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

// ── Sub-section Components ───────────────────────────────────────────────────

function PlanFormHeader({
  title,
  initialDataName,
  onBack,
}: {
  title?: string
  initialDataName?: string
  onBack: () => void
}) {
  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="rounded-full"
        aria-label="Go back to pricing list"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title || (initialDataName ? "Edit Pricing Plan" : "Create Pricing Plan")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {initialDataName
            ? `Updating plan: ${initialDataName}`
            : "Define a commercial plan or tier visible on /submit-manager"}
        </p>
      </div>
    </div>
  )
}

function PlanIdentifiersSection({
  form,
  onNameChange,
  isEditing,
}: {
  form: UseFormReturn<PlanFormValues>
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isEditing: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Plan Name *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Basic Author Package"
                {...field}
                onChange={onNameChange}
              />
            </FormControl>
            <FormDescription className="text-xs">
              Displayed prominently on the plan card
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Slug (URL key) *</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. basic-author"
                {...field}
                disabled={isEditing}
              />
            </FormControl>
            <FormDescription className="text-xs">
              {isEditing
                ? "Slug cannot be modified once created"
                : "Used in anchors and direct links (kebab-case)"}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function PlanDescriptionsSection({ form }: { form: UseFormReturn<PlanFormValues> }) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Comprehensive description of what is included in this package..."
                className="min-h-[90px] resize-y"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="short_description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Short Description (Optional)</FormLabel>
            <FormControl>
              <Input
                placeholder="One-line summary for compact views"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function PlanPricingSection({ form }: { form: UseFormReturn<PlanFormValues> }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Pricing & Frequency</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (USD) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="49.00"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Set to 0 for free/open tiers
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input
                  maxLength={3}
                  placeholder="USD"
                  {...field}
                  value={field.value || "USD"}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription className="text-xs">
                3-letter ISO code (USD, EUR, GBP)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="billing_interval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Interval</FormLabel>
              <FormControl>
                <select
                  {...field}
                  value={field.value || "one_time"}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="one_time">One-Time Payment</option>
                  <option value="month">Monthly Subscription</option>
                  <option value="year">Annual Subscription</option>
                </select>
              </FormControl>
              <FormDescription className="text-xs">
                Recurrence pattern
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function PlanCtaJournalSection({
  form,
  journals,
}: {
  form: UseFormReturn<PlanFormValues>
  journals: { id: string | bigint; title: string }[]
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Call to Action & Scope</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="cta_label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CTA Button Label</FormLabel>
              <FormControl>
                <Input
                  placeholder="Get Started"
                  {...field}
                  value={field.value || "Get Started"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cta_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CTA Destination URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="/submit-manager"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Defaults to /submit-manager if empty
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="journal_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Applicable Journal</FormLabel>
              <FormControl>
                <select
                  {...field}
                  value={field.value ? String(field.value) : ""}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">Global (All Journals)</option>
                  {journals.map((j) => (
                    <option key={String(j.id)} value={String(j.id)}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription className="text-xs">
                Leave empty for platform-wide packages
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stripe_price_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stripe Price ID (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="price_1..."
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Links to automated Stripe checkout
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function PlanVisibilitySection({ form }: { form: UseFormReturn<PlanFormValues> }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold border-b pb-2">Visibility & Badges</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="cursor-pointer">Active</FormLabel>
                <FormDescription className="text-xs">
                  Visible to the public
                </FormDescription>
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

        <FormField
          control={form.control}
          name="is_featured"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="cursor-pointer">Featured</FormLabel>
                <FormDescription className="text-xs">
                  Highlighted with accent border
                </FormDescription>
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

        <FormField
          control={form.control}
          name="sort_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  value={field.value ?? 0}
                  onChange={(e) => {
                    const trimmed = e.target.value.trim()
                    if (!trimmed || !/^-?\d+$/.test(trimmed)) {
                      field.onChange(0)
                      return
                    }
                    field.onChange(Number.parseInt(trimmed, 10))
                  }}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Ascending order (0 first)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <FormField
          control={form.control}
          name="available_from"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Available From (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Date and time when package becomes visible
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="available_until"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Available Until (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Date and time when package expires
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

function PlanFormActions({
  isSubmitting,
  isEditing,
  onCancel,
}: {
  isSubmitting: boolean
  isEditing: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[140px]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : isEditing ? (
          "Update Plan"
        ) : (
          "Create Plan"
        )}
      </Button>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function PlanForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  title,
}: PlanFormProps) {
  const router = useRouter()
  const { data: journals = [] } = useGetJournals()

  const [features, setFeatures] = useState<FeatureItem[]>(() => {
    const strings = parseInitialFeatureStrings(initialData?.features)
    return strings.map((s) => createFeatureItem(s))
  })
  const [featuresError, setFeaturesError] = useState<string | null>(null)

  const initialFeatureTexts = features.map((f) => f.text)

  const form = useForm<PlanFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(planFormSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      slug: initialData?.slug || "",
      description: initialData?.description || "",
      short_description: initialData?.short_description || "",
      price: initialData?.price !== undefined ? Number(initialData.price) : 0,
      currency: initialData?.currency || "USD",
      billing_interval: initialData?.billing_interval || "one_time",
      features: initialFeatureTexts,
      icon_key: initialData?.icon_key || "",
      image_url: initialData?.image_url || "",
      cta_label: initialData?.cta_label || "Get Started",
      cta_url: initialData?.cta_url || "",
      stripe_price_id: initialData?.stripe_price_id || "",
      is_active: initialData?.is_active ?? true,
      is_featured: initialData?.is_featured ?? false,
      sort_order: initialData?.sort_order ?? 0,
      available_from: formatToLocalDateTimeString(initialData?.available_from),
      available_until: formatToLocalDateTimeString(initialData?.available_until),
      journal_id: initialData?.journal_id ? String(initialData.journal_id) : undefined,
    },
  })

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    form.setValue("name", val)
    if (!initialData && !form.getValues("slug")) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      form.setValue("slug", generatedSlug)
    }
  }

  const handleFeatureChange = (id: string, value: string) => {
    const next = features.map((f) => (f.id === id ? { ...f, text: value } : f))
    setFeatures(next)
    form.setValue("features", next.map((f) => f.text))
    if (next.some((f) => f.text.trim().length > 0)) {
      setFeaturesError(null)
    }
  }

  const handleAddFeature = () => {
    const next = [...features, createFeatureItem("")]
    setFeatures(next)
    form.setValue("features", next.map((f) => f.text))
  }

  const handleRemoveFeature = (id: string) => {
    if (features.length <= 1) return
    const next = features.filter((f) => f.id !== id)
    setFeatures(next)
    form.setValue("features", next.map((f) => f.text))
  }

  const handleSubmit = async (values: PlanFormValues) => {
    const cleanFeatures = features.reduce<string[]>((acc, f) => {
      const trimmed = f.text.trim()
      if (trimmed.length > 0) {
        acc.push(trimmed)
      }
      return acc
    }, [])

    if (cleanFeatures.length === 0) {
      setFeaturesError("Please specify at least one feature")
      return
    }

    const payload: PricingPlanCreateInput = {
      ...values,
      features: cleanFeatures,
      price: Number(values.price),
      available_from: values.available_from ? new Date(values.available_from).toISOString() : undefined,
      available_until: values.available_until ? new Date(values.available_until).toISOString() : undefined,
      journal_id: values.journal_id ? String(values.journal_id) : undefined,
    }

    try {
      await onSubmit(payload)
      router.push("/admin/pricing")
    } catch {
      // Error handling is handled by mutation hook via toast
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PlanFormHeader
        title={title}
        initialDataName={initialData?.name}
        onBack={() => router.push("/admin/pricing")}
      />

      <Card className="rounded-2xl border bg-card shadow-xs">
        <CardHeader className="pb-4">
          <CardTitle>Plan Details</CardTitle>
          <CardDescription>
            All fields configured here directly power the public-facing plan cards and billing workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              <PlanIdentifiersSection
                form={form}
                onNameChange={handleNameChange}
                isEditing={Boolean(initialData)}
              />

              <PlanDescriptionsSection form={form} />

              <PlanPricingSection form={form} />

              <FeatureListEditor
                features={features}
                onChange={handleFeatureChange}
                onAdd={handleAddFeature}
                onRemove={handleRemoveFeature}
                error={featuresError || undefined}
              />

              <PlanCtaJournalSection form={form} journals={journals} />

              <PlanVisibilitySection form={form} />

              <PlanFormActions
                isSubmitting={isSubmitting}
                isEditing={Boolean(initialData)}
                onCancel={() => router.push("/admin/pricing")}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
