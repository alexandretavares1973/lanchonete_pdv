export type ReportDateRange = {
  startDate?: string;
  endDate?: string;
};

export type ReportDateShortcut = "today" | "week" | "month";

export type ReportSessionSearchLike = {
  responsibleName?: string | null;
  orders: Array<{ customerName?: string | null }>;
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

export function matchesReportSearch<T extends ReportSessionSearchLike>(session: T, searchTerm: string) {
  const normalized = searchTerm.trim().toLocaleLowerCase("pt-BR");
  if (!normalized) return true;
  const matchesResponsible = (session.responsibleName || "").toLocaleLowerCase("pt-BR").includes(normalized);
  const matchesCustomer = session.orders.some((order) => (order.customerName || "").toLocaleLowerCase("pt-BR").includes(normalized));
  return matchesResponsible || matchesCustomer;
}

function formatLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getReportDateShortcutRange(shortcut: ReportDateShortcut, now = new Date()): ReportDateRange {
  const current = new Date(now);
  if (shortcut === "today") {
    const date = formatLocalDate(current);
    return { startDate: date, endDate: date };
  }

  if (shortcut === "month") {
    const first = new Date(current.getFullYear(), current.getMonth(), 1);
    const last = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    return { startDate: formatLocalDate(first), endDate: formatLocalDate(last) };
  }

  const dayOfWeek = current.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(current);
  monday.setDate(current.getDate() - daysSinceMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startDate: formatLocalDate(monday), endDate: formatLocalDate(sunday) };
}
