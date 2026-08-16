export function getReportCustomerLabel(customerName?: string | null): string {
  if (!customerName) return "GERAL";
  const trimmed = String(customerName).trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return "GERAL";
  return trimmed;
}
