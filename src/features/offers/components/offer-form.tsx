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
import { offerCreateSchema, type OfferCreateInput } from "../schemas/offer-schema"
import type { Offer } from "../types/offer"
import { useGetJournals } from "@/src/features/journals/api/use-get-journals"
import { useGetPricingPlans } from "@/src/features/billing/api/use-get-pricing-plans"

interface OfferFormProps {
  initialData?: Offer | null
  onSubmit: (data: OfferCreateInput) => Promise<unknown>
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
// ─────────────────────────────────────────────────────────────────────────────

export function OfferForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  title = initialData ? "Edit Package / Offer" : "Create New Package / Offer",
}: OfferFormProps) {
  const router = useRouter()
  const { data: journals = [] } = useGetJournals()
  const { data: pricingPlans = [] } = useGetPricingPlans()

  // Features list state
  const [featureInputs, setFeatureInputs] = useState<string[]>(
    initialData?.features && initialData.features.length > 0
      ? initialData.features
      : ["Dedicated editorial handling", "Standard peer-review turnaround"]
  )

  const defaultValues: Partial<OfferCreateInput> = {
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    price_cents: initialData ? initialData.price_cents : 0,
    currency: initialData?.currency || "USD",
    billing_interval: initialData?.billing_interval || "month",
    features: featureInputs,
    icon_key: initialData?.icon_key || "",
    image_url: initialData?.image_url || "",
    cta_text: initialData?.cta_text || "Get Started",
    cta_url: initialData?.cta_url || "",
    is_active: initialData?.is_active ?? true,
    is_featured: initialData?.is_featured ?? false,
    sort_order: initialData?.sort_order ?? 0,
    available_from: initialData?.available_from ? new Date(initialData.available_from).toISOString().slice(0, 16) : undefined,
    available_until: initialData?.available_until ? new Date(initialData.available_until).toISOString().slice(0, 16) : undefined,
    pricing_plan_id: initialData?.pricing_plan_id ? String(initialData.pricing_plan_id) : undefined,
    journal_id: initialData?.journal_id ? String(initialData.journal_id) : undefined,
  }

  const form = useForm<OfferCreateInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(offerCreateSchema) as any,
    defaultValues: defaultValues as OfferCreateInput,
  })

  // Synchronize name to slug if slug has not been manually edited
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    form.setValue("name", val)
    if (!initialData && !form.getFieldState("slug").isDirty) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
      form.setValue("slug", generatedSlug)
    }
  }

  const handleAddFeature = () => {
    const next = [...featureInputs, ""]
    setFeatureInputs(next)
    form.setValue("features", next.filter(Boolean))
  }

  const handleFeatureChange = (index: number, value: string) => {
    const next = [...featureInputs]
    next[index] = value
    setFeatureInputs(next)
    form.setValue("features", next.filter(Boolean))
  }

  const handleRemoveFeature = (index: number) => {
    if (featureInputs.length <= 1) return
    const next = featureInputs.filter((_, i) => i !== index)
    setFeatureInputs(next)
    form.setValue("features", next.filter(Boolean))
  }

  const handleSubmit = async (values: OfferCreateInput) => {
    // Ensure features are passed
    const cleanFeatures = featureInputs.flatMap((f) => {
      const t = f.trim()
      return t ? [t] : []
    })
    if (cleanFeatures.length === 0) {
      form.setError("features", { message: "Please specify at least one feature" })
      return
    }

    const payload: OfferCreateInput = {
      ...values,
      features: cleanFeatures,
      price_cents: Number(values.price_cents),
      sort_order: Number(values.sort_order || 0),
      pricing_plan_id: values.pricing_plan_id ? String(values.pricing_plan_id) : undefined,
      journal_id: values.journal_id ? String(values.journal_id) : undefined,
      available_from: values.available_from ? new Date(values.available_from).toISOString() : undefined,
      available_until: values.available_until ? new Date(values.available_until).toISOString() : undefined,
    }

    await onSubmit(payload)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/offers")}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Offers
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription>
            Configure the public package presentation, pricing, features, and target journal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Package Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Standard Publication"
                            {...field}
                            onChange={handleNameChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. standard-publication" {...field} />
                        </FormControl>
                        <FormDescription>
                          Lowercase letters, numbers, and hyphens only
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Short summary highlighting the tier value..."
                          rows={2}
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
                <h3 className="text-lg font-semibold border-b pb-2">Pricing & Billing</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price_cents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (in Cents) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="e.g. 14900 ($149.00)"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          ${((Number(field.value) || 0) / 100).toFixed(2)}
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
                        <FormLabel>Currency *</FormLabel>
                        <FormControl>
                          <Input maxLength={3} placeholder="USD" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billing_interval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Interval *</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            <option value="month">Monthly</option>
                            <option value="year">Annual</option>
                            <option value="one_time">One-Time</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FeatureListEditor
                features={featureInputs}
                onChange={handleFeatureChange}
                onAdd={handleAddFeature}
                onRemove={handleRemoveFeature}
                error={form.formState.errors.features?.message}
              />

              {/* Call to Action & Links */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Action & Routing</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cta_text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CTA Button Label</FormLabel>
                        <FormControl>
                          <Input placeholder="Get Started" {...field} />
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
                        <FormLabel>Custom CTA URL (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. /submit-manager or https://..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          If empty, defaults to Stripe checkout or submit manager
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="journal_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Associated Journal (Optional)</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            value={field.value || ""}
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
                        <FormDescription>
                          Leave empty for platform-wide packages
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pricing_plan_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Linked Stripe Pricing Plan (Optional)</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            value={field.value || ""}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            <option value="">None / Custom Link</option>
                            {pricingPlans.map((p) => (
                              <option key={p.id} value={String(p.id)}>
                                {p.name} (${Number(p.price)})
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormDescription>
                          Links to automated Stripe billing plan
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
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/offers")}
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
                    "Update Package"
                  ) : (
                    "Create Package"
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
