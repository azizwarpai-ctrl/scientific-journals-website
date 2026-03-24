"use client"

import { useState } from "react"
import { useGetPricingPlans } from "@/src/features/billing/api/use-get-pricing-plans"
import { useCreatePricingPlan } from "@/src/features/billing/api/use-create-pricing-plan"
import { useUpdatePricingPlan } from "@/src/features/billing/api/use-update-pricing-plan"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export const PricingClient = () => {
  const { data: plans, isLoading } = useGetPricingPlans()
  const { mutate: createPlan, isPending: isCreating } = useCreatePricingPlan()
  const { mutate: updatePlan, isPending: isUpdating } = useUpdatePricingPlan()

  const [isOpen, setIsOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  
  // Form State
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [stripePriceId, setStripePriceId] = useState("")
  const [isActive, setIsActive] = useState(true)

  const handleOpenDialog = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan)
      setName(plan.name)
      setPrice(plan.price.toString())
      setStripePriceId(plan.stripe_price_id || "")
      setIsActive(plan.is_active)
    } else {
      setEditingPlan(null)
      setName("")
      setPrice("")
      setStripePriceId("")
      setIsActive(true)
    }
    setIsOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      name,
      price: parseFloat(price),
      stripePriceId: stripePriceId || undefined,
      isActive,
      features: {}, // Simplified for now, can be expanded later
    }

    if (editingPlan) {
      updatePlan(
        { id: editingPlan.id.toString(), data: payload },
        { onSuccess: () => setIsOpen(false) }
      )
    } else {
      createPlan(payload, { onSuccess: () => setIsOpen(false) })
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="e.g. Pro Plan"
                />
              </div>
              <div className="space-y-2">
                <Label>Price (Monthly USD)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  required 
                  placeholder="e.g. 29.99"
                />
              </div>
              <div className="space-y-2">
                <Label>Stripe Price ID</Label>
                <Input 
                  value={stripePriceId} 
                  onChange={(e) => setStripePriceId(e.target.value)} 
                  placeholder="price_1Nw..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={isActive} 
                  onCheckedChange={setIsActive} 
                />
                <Label>Active</Label>
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
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : plans?.length === 0 ? (
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
          {plans?.map((plan: any) => (
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
                <div className="text-3xl font-bold">${plan.price.toString()}</div>
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
