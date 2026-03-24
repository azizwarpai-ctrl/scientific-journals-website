"use client"

import type { PricingPlan } from "@prisma/client"
import { toast } from "sonner"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useGetPricingPlans } from "@/src/features/billing/api/use-get-pricing-plans"
import { useCreatePricingPlan } from "@/src/features/billing/api/use-create-pricing-plan"
import { useUpdatePricingPlan } from "@/src/features/billing/api/use-update-pricing-plan"
import { pricingPlanCreateSchema, type PricingPlanCreateInput } from "@/src/features/billing/schemas/billing-schema"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

export const PricingClient = () => {
  const { data: plans, isLoading } = useGetPricingPlans()
  const { mutate: createPlan, isPending: isCreating } = useCreatePricingPlan()
  const { mutate: updatePlan, isPending: isUpdating } = useUpdatePricingPlan()

  const [isOpen, setIsOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null)
  
  const form = useForm<PricingPlanCreateInput>({
    resolver: zodResolver(pricingPlanCreateSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stripePriceId: "",
      isActive: true,
      isPopular: false,
      features: {},
    },
  })

  const handleOpenDialog = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan)
      form.reset({
        name: plan.name,
        description: plan.description || "",
        price: Number(plan.price),
        stripePriceId: plan.stripe_price_id || "",
        isActive: plan.is_active,
        isPopular: plan.is_popular,
        features: plan.features || {},
      })
    } else {
      setEditingPlan(null)
      form.reset({
        name: "",
        description: "",
        price: 0,
        stripePriceId: "",
        isActive: true,
        isPopular: false,
        features: {},
      })
    }
    setIsOpen(true)
  }

  const onSubmit = (values: PricingPlanCreateInput) => {
    if (editingPlan) {
      updatePlan(
        { id: editingPlan.id.toString(), data: values },
        { onSuccess: () => setIsOpen(false) }
      )
    } else {
      createPlan(values, { onSuccess: () => setIsOpen(false) })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Plans</h1>
          <p className="text-muted-foreground mt-1">Manage subscription pricing and features</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Pro Plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Perfect for side projects" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (Monthly USD)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="e.g. 29.99" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stripePriceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stripe Price ID</FormLabel>
                      <FormControl>
                        <Input placeholder="price_1Nw..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center space-x-6 pt-2">
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal cursor-pointer">Active</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isPopular"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal cursor-pointer">Popular Badge</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 flex justify-end space-x-2">
                  <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (plans as any[])?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">No pricing plans found</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first pricing plan to start monetizing</p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(plans as any[])?.map((plan: any) => (
            <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(plan)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <div className="text-3xl font-bold">${plan.price.toString()}</div>
                  {plan.is_popular && <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Popular</div>}
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2 min-h-10">
                  {plan.description || "No description provided."}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>Stripe ID: {plan.stripe_price_id || "N/A"}</div>
                  <div>Status: {plan.is_active ? "Active" : "Inactive"}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
