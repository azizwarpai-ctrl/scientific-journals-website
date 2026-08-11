"use client"

import { useRouter } from "next/navigation"
import type { ColumnDef } from "@tanstack/react-table"
import { FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DataTable, sortableHeader } from "@/components/data-table/data-table"
import type { CsvColumn } from "@/components/data-table/csv-export"
import { cn, statusBadgeClass } from "@/src/lib/utils"

/**
 * Stable date string (pinned en-US + UTC). This renders inside a client
 * component that is server-rendered with the same row props, so an unpinned
 * locale/timezone would differ between SSR and hydration → React #418.
 */
function formatDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { timeZone: "UTC" })
}

export interface SubmissionRow {
  id: string
  title: string
  journalTitle: string
  journalField: string
  author: string
  authorEmail: string
  status: string
  date: string
}

const columns: ColumnDef<SubmissionRow, unknown>[] = [
  {
    accessorKey: "title",
    header: sortableHeader<SubmissionRow>("Title"),
    cell: ({ row }) => (
      <span className="font-medium line-clamp-2">{row.original.title}</span>
    ),
  },
  {
    accessorKey: "journalTitle",
    header: "Journal",
    cell: ({ row }) => (
      <div>
        <div className="line-clamp-1">{row.original.journalTitle}</div>
        <div className="text-xs text-muted-foreground">{row.original.journalField}</div>
      </div>
    ),
  },
  {
    accessorKey: "author",
    header: sortableHeader<SubmissionRow>("Author"),
    cell: ({ row }) => (
      <div>
        <div>{row.original.author}</div>
        <div className="text-xs text-muted-foreground">{row.original.authorEmail}</div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          "border-transparent whitespace-nowrap",
          statusBadgeClass(row.original.status)
        )}
      >
        {row.original.status.replace("_", " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "date",
    header: sortableHeader<SubmissionRow>("Date"),
    cell: ({ row }) => formatDate(row.original.date),
  },
]

const csvColumns: CsvColumn<SubmissionRow>[] = [
  { header: "Title", accessor: (row) => row.title },
  { header: "Journal", accessor: (row) => row.journalTitle },
  { header: "Author", accessor: (row) => row.author },
  { header: "Status", accessor: (row) => row.status },
  { header: "Date", accessor: (row) => formatDate(row.date) },
]

export function SubmissionsTable({
  rows,
  hasFilters,
}: {
  rows: SubmissionRow[]
  hasFilters: boolean
}) {
  const router = useRouter()

  return (
    <DataTable
      columns={columns}
      data={rows}
      csv={{ filename: "submissions", columns: csvColumns }}
      onRowClick={(row) => router.push(`/admin/submissions/${row.id}`)}
      emptyState={
        <div className="py-6">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No submissions found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFilters ? "Try adjusting your filters" : "Submissions will appear here"}
          </p>
        </div>
      }
    />
  )
}
