"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Pencil,
  Trash2,
  Sparkles,
  Plus,
  BookOpen,
} from "lucide-react"
import { OfferBadge } from "./offer-badge"
import type { Offer } from "../types/offer"
import { useToggleOffer, useDeleteOffer, useReorderOffer } from "../api/use-admin-offers"

interface OffersTableProps {
  offers: Offer[]
  isLoading?: boolean
}

export function OffersTable({ offers, isLoading = false }: OffersTableProps) {
  const { mutate: toggleOffer, isPending: isToggling } = useToggleOffer()
  const { mutate: deleteOffer, isPending: isDeleting } = useDeleteOffer()
  const { mutate: reorderOffer } = useReorderOffer()

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleToggle = (id: string, current: boolean) => {
    toggleOffer({ id, is_active: !current })
  }

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      setDeletingId(id)
      deleteOffer(id, {
        onSettled: () => setDeletingId(null),
      })
    }
  }

  const handleOrderChange = (id: string, newOrder: number) => {
    reorderOffer({ id, sort_order: newOrder })
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Loading packages and offers...
      </div>
    )
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-muted text-muted-foreground">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold">No offers found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          You haven&apos;t configured any offers or packages yet. Create your first package to display on the /packages page.
        </p>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white">
          <Link href="/admin/offers/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Package
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[60px]">Order</TableHead>
            <TableHead>Package Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Featured</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => {
            const priceFormatted = `$${(offer.price_cents / 100).toFixed(2)}`
            return (
              <TableRow key={offer.id} className="hover:bg-muted/30">
                <TableCell>
                  <input
                    type="number"
                    defaultValue={offer.sort_order}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val !== offer.sort_order) {
                        handleOrderChange(offer.id, val)
                      }
                    }}
                    className="w-12 h-7 px-1 text-center text-xs rounded border border-input bg-background"
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>{offer.name}</span>
                      {offer.is_featured && (
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 inline-block" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      /{offer.slug}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">
                    {offer.price_cents === 0 ? "Free" : priceFormatted}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {offer.billing_interval.replace("_", " ")}
                  </div>
                </TableCell>
                <TableCell>
                  {offer.journal ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      <BookOpen className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{offer.journal.title}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium">Global</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={offer.is_active}
                      onCheckedChange={() => handleToggle(offer.id, offer.is_active)}
                      disabled={isToggling}
                    />
                    <OfferBadge type="status" value={offer.is_active} />
                  </div>
                </TableCell>
                <TableCell>
                  {offer.is_featured ? (
                    <OfferBadge type="featured" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm">
                      <Link href={`/admin/offers/${offer.id}/edit`}>
                        <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(offer.id, offer.name)}
                      disabled={isDeleting && deletingId === offer.id}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
