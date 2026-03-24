"use client"

import { useGetSubscription } from "@/src/features/billing/api/use-get-subscription"
import { useCreatePortal } from "@/src/features/billing/api/use-create-portal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CreditCard, ExternalLink } from "lucide-react"

export const SubscriptionStatus = () => {
  const { data: subscription, isLoading } = useGetSubscription()
  const { mutate: createPortal, isPending: isCreatingPortal } = useCreatePortal()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-[120px]" />
        </CardContent>
      </Card>
    )
  }

  const isActive = subscription?.status === "active"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Subscription</CardTitle>
            <CardDescription>
              Manage your billing and subscription plan.
            </CardDescription>
          </div>
          {subscription && (
            <Badge variant={isActive ? "default" : "destructive"}>
              {subscription.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {subscription ? (
          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium">Current Period Ends:</p>
              <p className="text-muted-foreground">
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => createPortal()}
              disabled={isCreatingPortal}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Billing
              <ExternalLink className="ml-2 h-3 w-3 opacity-50" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are currently on the free tier. Upgrade to access premium features.
            </p>
            {/* The checkout flow is handled separately, usually on a pricing page */}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
