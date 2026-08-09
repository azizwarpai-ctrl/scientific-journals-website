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
    cell: ({ row }) => new Date(row.original.latestSubmission).toLocaleDateString(),
  },
]

const csvColumns: CsvColumn<AuthorRow>[] = [
  { header: "Name", accessor: (row) => row.name },
  { header: "Email", accessor: (row) => row.email },
  { header: "Submissions", accessor: (row) => row.submissions },
  {
    header: "Latest Submission",
    accessor: (row) => new Date(row.latestSubmission).toLocaleDateString(),
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
