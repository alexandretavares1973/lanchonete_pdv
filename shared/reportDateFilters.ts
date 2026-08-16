export type ReportDateRange = {
  startDate?: string;
  endDate?: string;
};

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999`).getTime();
}

export function isReportDateRangeValid(range: ReportDateRange) {
  if (!range.startDate || !range.endDate) return true;
  return range.startDate <= range.endDate;
}

export function isWithinReportDateRange(value: Date | string, range: ReportDateRange) {
  if (!isReportDateRangeValid(range)) return false;
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  if (range.startDate && timestamp < startOfDay(range.startDate)) return false;
  if (range.endDate && timestamp > endOfDay(range.endDate)) return false;
  return true;
}

export function filterOrdersByReportDate<T extends { createdAt: Date | string }>(orders: T[], range: ReportDateRange) {
  return orders.filter((order) => isWithinReportDateRange(order.createdAt, range));
}
