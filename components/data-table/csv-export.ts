/**
 * Client-side table export for DataTable. Supports CSV, JSON, and XLSX, all
 * driven by the same generic `CsvColumn` accessors.
 *
 * CSV is BigInt-safe (everything stringified), quotes fields per RFC 4180, and
 * neutralizes spreadsheet formula injection: exported values come from
 * user-supplied content (submission titles, author names, …), so a leading
 * `=`, `+`, `-`, `@`, tab, or CR would otherwise execute as a formula when the
 * CSV is opened in Excel/Sheets. Such values get the standard OWASP
 * single-quote prefix.
 */

export interface CsvColumn<TData> {
    header: string
    accessor: (row: TData) => unknown
}

const FORMULA_TRIGGER = /^[=+\-@\t\r]/

function csvEscape(value: unknown): string {
    let s = value === null || value === undefined ? "" : String(value)
    if (FORMULA_TRIGGER.test(s)) {
        s = `'${s}`
    }
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** BigInt → string, null/undefined → null; everything else passthrough. */
function jsonValue(value: unknown): unknown {
    if (value === null || value === undefined) return null
    if (typeof value === "bigint") return value.toString()
    return value
}

export function rowsToCsv<TData>(rows: TData[], columns: CsvColumn<TData>[]): string {
    const header = columns.map((c) => csvEscape(c.header)).join(",")
    const body = rows.map((row) => columns.map((c) => csvEscape(c.accessor(row))).join(","))
    return [header, ...body].join("\r\n")
}

export function rowsToJson<TData>(rows: TData[], columns: CsvColumn<TData>[]): string {
    const objs = rows.map((row) => {
        const o: Record<string, unknown> = {}
        for (const c of columns) o[c.header] = jsonValue(c.accessor(row))
        return o
    })
    return JSON.stringify(objs, null, 2)
}

/** Shared object-URL + programmatic-anchor download; appends `.ext` if absent. */
function saveBlob(blob: Blob, filename: string, ext: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}

export function downloadCsv<TData>(rows: TData[], columns: CsvColumn<TData>[], filename: string): void {
    const csv = rowsToCsv(rows, columns)
    // Prepend a UTF-8 BOM so Excel detects the encoding.
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" })
    saveBlob(blob, filename, "csv")
}

export function downloadJson<TData>(rows: TData[], columns: CsvColumn<TData>[], filename: string): void {
    const blob = new Blob([rowsToJson(rows, columns)], { type: "application/json;charset=utf-8" })
    saveBlob(blob, filename, "json")
}

/**
 * XLSX export. SheetJS is imported dynamically so it stays out of the initial
 * bundle — only loaded when a user actually exports to Excel.
 */
export async function downloadXlsx<TData>(rows: TData[], columns: CsvColumn<TData>[], filename: string): Promise<void> {
    const XLSX = await import("xlsx")
    const aoa: unknown[][] = [
        columns.map((c) => c.header),
        ...rows.map((row) => columns.map((c) => jsonValue(c.accessor(row)))),
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
    const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    saveBlob(blob, filename, "xlsx")
}
