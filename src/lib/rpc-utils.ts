/**
 * RPC utility functions
 */

export async function parseRpcResponse<T>(res: any, defaultErrorMessage = "Request failed"): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    throw new Error((data as any).error || defaultErrorMessage)
  }
  return data as T
}
