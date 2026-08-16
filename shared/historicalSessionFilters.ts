export type HistoricalSessionFilterOrder = "openedAtDesc" | "openedAtAsc" | "ordersDesc" | "totalDesc";

export type HistoricalSessionFilterInput = {
  startDate?: string;
  endDate?: string;
  sortBy?: HistoricalSessionFilterOrder;
  searchTerm?: string;
};

export type HistoricalSessionLike = {
  id: number;
  openedAt: Date | string;
  orders: Array<{ total: number | string | null | undefined; customerName?: string | null }>;
};

function timestamp(value: Date | string) {
  const result = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(result) ? result : 0;
}

function dayStart(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function dayEnd(value: string) {
  return new Date(`${value}T23:59:59.999`).getTime();
}

function totalOf(session: HistoricalSessionLike) {
  return session.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
}

export function filterAndSortHistoricalSessions<T extends HistoricalSessionLike>(
  sessions: T[],
  filters: HistoricalSessionFilterInput,
) {
  const start = filters.startDate ? dayStart(filters.startDate) : Number.NEGATIVE_INFINITY;
  const end = filters.endDate ? dayEnd(filters.endDate) : Number.POSITIVE_INFINITY;
  const searchTerm = (filters.searchTerm || "").trim().toLocaleLowerCase("pt-BR");
  const filtered = sessions.filter((session) => {
    const openedAt = timestamp(session.openedAt);
    if (openedAt < start || openedAt > end) return false;
    if (!searchTerm) return true;
    const matchesSessionId = String(session.id).includes(searchTerm);
    const matchesCustomer = session.orders.some((order) => (order.customerName || "").toLocaleLowerCase("pt-BR").includes(searchTerm));
    return matchesSessionId || matchesCustomer;
  });

  return [...filtered].sort((left, right) => {
    const order = filters.sortBy || "openedAtDesc";
    if (order === "openedAtAsc") return timestamp(left.openedAt) - timestamp(right.openedAt) || left.id - right.id;
    if (order === "ordersDesc") return right.orders.length - left.orders.length || timestamp(right.openedAt) - timestamp(left.openedAt);
    if (order === "totalDesc") return totalOf(right) - totalOf(left) || timestamp(right.openedAt) - timestamp(left.openedAt);
    return timestamp(right.openedAt) - timestamp(left.openedAt) || right.id - left.id;
  });
}
