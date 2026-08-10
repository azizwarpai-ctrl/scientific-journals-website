"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Users } from "lucide-react"
import { DataTable, sortableHeader } from "@/components/data-table/data-table"
import type { CsvColumn } from "@/components/data-table/csv-export"

export interface AuthorRow {
  name: string
  email: string
  submissions: number
  latestSubmission: string
}

/** Format an ISO date to a stable date string, or "—" when missing/invalid. */
function formatDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { timeZone: "UTC" })
}

const columns: ColumnDef<AuthorRow, unknown>[] = [
  {
    accessorKey: "name",
    header: sortableHeader<AuthorRow>("Name"),
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "submissions",
    header: sortableHeader<AuthorRow>("Submissions"),
    cell: ({ row }) => (
      <span>
        {row.original.submissions} submission{row.original.submissions !== 1 ? "s" : ""}
      </span>
    ),
  },
  {
    accessorKey: "latestSubmission",
    header: sortableHeader<AuthorRow>("Latest Submission"),
    cell: ({ row }) => formatDate(row.original.latestSubmission),
  },
]

const csvColumns: CsvColumn<AuthorRow>[] = [
  { header: "Name", accessor: (row) => row.name },
  { header: "Email", accessor: (row) => row.email },
  { header: "Submissions", accessor: (row) => row.submissions },
  {
    header: "Latest Submission",
    accessor: (row) => formatDate(row.latestSubmission),
  },
]

export function AuthorsTable({ rows }: { rows: AuthorRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchKey="name"
      searchPlaceholder="Search authors…"
      csv={{ filename: "authors", columns: csvColumns }}
      emptyState={
        <div className="py-6">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No authors yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Authors will appear here after submitting manuscripts
          </p>
        </div>
      }
    />
  )
}
