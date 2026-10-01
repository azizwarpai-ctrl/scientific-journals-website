/**
 * Format a numeric amount into localized currency string, with safe fallback
 * for invalid currency codes or formatting errors.
 */
export function formatCurrency(amount: number, currencyCode: string = "USD"): string {
  const currency = (currencyCode || "USD").toUpperCase()
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(amount % 1 === 0 ? 0 : 2)} ${currency}`
  }
}
