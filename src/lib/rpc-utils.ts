/**
 * RPC utility functions
 */

export async function parseRpcResponse<T>(res: Response, defaultErrorMessage = "Request failed"): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    const errorMsg = (data as { error?: string }).error || defaultErrorMessage
    throw new Error(errorMsg)
  }
  return data as T
}
