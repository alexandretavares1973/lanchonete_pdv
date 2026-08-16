export function getReportCustomerLabel(customerName?: string | null): string {
  const normalizedName = customerName?.trim();
  return normalizedName || "GERAL";
}
