"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
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

// ── FeatureListEditor ─────────────────────────────────────────────────────────
interface FeatureListEditorProps {
  features: string[]
  onChange: (index: number, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
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
          <div key={`${feature}-${idx}`} className="flex items-center gap-2">
            <Input
              value={feature}
              placeholder={`Feature ${idx + 1}`}
              onChange={(e) => onChange(idx, e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(idx)}
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

export function PlanForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  title,
}: PlanFormProps) {
  const router = useRouter()
  const { data: journals = [] } = useGetJournals()

  let initialFeatures: string[] = [""]
  if (initialData?.features) {
    if (Array.isArray(initialData.features)) {
      initialFeatures = initialData.features.map(String)
    } else if (typeof initialData.features === "object") {
      initialFeatures = Object.entries(initialData.features)
        .filter(([_, v]) => Boolean(v))
        .map(([k]) => k)
    }
  }
  if (initialFeatures.length === 0) initialFeatures = [""]

  const [features, setFeatures] = useState<string[]>(initialFeatures)
  const [featuresError, setFeaturesError] = useState<string | null>(null)

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
      features: initialFeatures,
      icon_key: initialData?.icon_key || "",
      image_url: initialData?.image_url || "",
      cta_label: initialData?.cta_label || "Get Started",
      cta_url: initialData?.cta_url || "",
      stripe_price_id: initialData?.stripe_price_id || "",
      is_active: initialData?.is_active ?? true,
      is_featured: initialData?.is_featured ?? false,
      sort_order: initialData?.sort_order ?? 0,
      available_from: initialData?.available_from
        ? new Date(String(initialData.available_from)).toISOString().slice(0, 16)
        : "",
      available_until: initialData?.available_until
        ? new Date(String(initialData.available_until)).toISOString().slice(0, 16)
        : "",
      journal_id: initialData?.journal_id ? String(initialData.journal_id) : undefined,
    },
  })

  // Auto-slug generator
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

  const handleFeatureChange = (index: number, value: string) => {
    const next = [...features]
    next[index] = value
    setFeatures(next)
    form.setValue("features", next)
    if (next.some((f) => f.trim().length > 0)) {
      setFeaturesError(null)
    }
  }

  const handleAddFeature = () => {
    const next = [...features, ""]
    setFeatures(next)
    form.setValue("features", next)
  }

  const handleRemoveFeature = (index: number) => {
    if (features.length <= 1) return
    const next = features.filter((_, idx) => idx !== index)
    setFeatures(next)
    form.setValue("features", next)
  }

  const handleSubmit = async (values: PlanFormValues) => {
    const cleanFeatures = features.map((f) => f.trim()).filter((f) => f.length > 0)
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
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/pricing")}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title || (initialData ? "Edit Pricing Plan" : "Create Pricing Plan")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {initialData
              ? `Updating plan: ${initialData.name}`
              : "Define a commercial plan or tier visible on /submit-manager"}
          </p>
        </div>
      </div>

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
              {/* Primary Identifiers */}
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
                          onChange={handleNameChange}
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
                          disabled={Boolean(initialData)}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {initialData
                          ? "Slug cannot be modified once created"
                          : "Used in anchors and direct links (kebab-case)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Descriptions */}
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

              {/* Pricing & Billing */}
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

              {/* Features List */}
              <FeatureListEditor
                features={features}
                onChange={handleFeatureChange}
                onAdd={handleAddFeature}
                onRemove={handleRemoveFeature}
                error={featuresError || undefined}
              />

              {/* Call To Action */}
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
                              <option key={j.id} value={String(j.id)}>
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

              {/* Toggles & Visibility */}
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
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
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

                {/* Availability Window */}
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/pricing")}
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
                  ) : initialData ? (
                    "Update Plan"
                  ) : (
                    "Create Plan"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
