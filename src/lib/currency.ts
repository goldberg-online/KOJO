/**
 * Ghana Cedi (GHS) formatting helpers.
 * Symbol: GH₵  ·  ISO code: GHS
 */

const GHS_FORMATTER = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as Ghana Cedis, e.g. GH₵1,500.00 */
export function formatGHS(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "GH₵0.00";
  return GHS_FORMATTER.format(amount);
}

/** Short label for forms / placeholders */
export const CURRENCY_LABEL = "GH₵";
export const CURRENCY_CODE = "GHS";
export const CURRENCY_NAME = "Ghana Cedi";
