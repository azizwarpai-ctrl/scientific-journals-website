/**
 * Shared client-side check for the OJS_UNAVAILABLE error envelope (spec FR-010).
 * The API returns 503 { success: false, error: "OJS_UNAVAILABLE" }, which
 * parseRpcResponse surfaces as an Error with that exact message.
 */
export function isOjsUnavailable(error: unknown): boolean {
    return error instanceof Error && error.message === "OJS_UNAVAILABLE"
}
