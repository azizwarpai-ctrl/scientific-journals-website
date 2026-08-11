"use client"

import * as React from "react"
import {
    type ColumnDef,
    type SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown, Download, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadCsv, downloadJson, downloadXlsx, type CsvColumn } from "./csv-export"

interface DataTableProps<TData> {
    columns: ColumnDef<TData, unknown>[]
    data: TData[]
    /** Column id to bind the search input to; omit to hide the search box. */
    searchKey?: string
    searchPlaceholder?: string
    pageSize?: number
    /** Enables the CSV export button. */
    csv?: { filename: string; columns: CsvColumn<TData>[] }
    emptyState?: React.ReactNode
    /** Row click navigation (whole row becomes clickable). */
    onRowClick?: (row: TData) => void
}

/** Sortable header helper for column defs. */
export function sortableHeader<TData>(label: string) {
    return function SortableHeader({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) {
        const sorted = column.getIsSorted()
        const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown
        return (
            <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => column.toggleSorting(sorted === "asc")}
                aria-label={`Sort by ${label}`}
            >
                {label}
                <Icon className="ml-2 h-3.5 w-3.5" />
            </Button>
        )
    }
}

export function DataTable<TData>({
    columns,
    data,
    searchKey,
    searchPlaceholder = "Search…",
    pageSize = 20,
    csv,
    emptyState,
    onRowClick,
}: DataTableProps<TData>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = React.useState("")

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: { pagination: { pageSize } },
    })

    const searchColumn = searchKey ? table.getColumn(searchKey) : undefined

    return (
        <div className="space-y-3">
            {(searchColumn || csv) && (
                <div className="flex items-center justify-between gap-2">
                    {searchColumn ? (
                        <Input
                            value={(searchColumn.getFilterValue() as string) ?? globalFilter}
                            onChange={(e) => {
                                setGlobalFilter(e.target.value)
                                searchColumn.setFilterValue(e.target.value)
                            }}
                            placeholder={searchPlaceholder}
                            className="max-w-xs"
                            aria-label={searchPlaceholder}
                        />
                    ) : (
                        <div />
                    )}
                    {csv && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={table.getFilteredRowModel().rows.length === 0}
                                    aria-label="Export table"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() =>
                                        downloadCsv(
                                            table.getFilteredRowModel().rows.map((r) => r.original),
                                            csv.columns,
                                            csv.filename
                                        )
                                    }
                                >
                                    CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        downloadJson(
                                            table.getFilteredRowModel().rows.map((r) => r.original),
                                            csv.columns,
                                            csv.filename
                                        )
                                    }
                                >
                                    JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        // XLSX export dynamically imports SheetJS + writes a
                                        // workbook — both can reject; surface a toast instead
                                        // of an unhandled rejection.
                                        downloadXlsx(
                                            table.getFilteredRowModel().rows.map((r) => r.original),
                                            csv.columns,
                                            csv.filename
                                        ).catch(() => toast.error("Failed to export to Excel"))
                                    }}
                                >
                                    Excel (.xlsx)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center">
                                    {emptyState ?? (
                                        <span className="text-muted-foreground">No results.</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className={onRowClick ? "cursor-pointer" : undefined}
                                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {table.getPageCount() > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            aria-label="Next page"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
