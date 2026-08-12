export interface CustomerBackup<T = unknown> {
  id: string;
  createdAt: string;
  customers: T[];
}

export const CUSTOMER_BACKUPS_KEY = "customerBackups";
const MAX_BACKUPS = 10;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function readCustomerBackups<T = unknown>(storage?: StorageLike): CustomerBackup<T>[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(CUSTOMER_BACKUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((backup): backup is CustomerBackup<T> =>
      Boolean(backup && typeof backup.id === "string" && typeof backup.createdAt === "string" && Array.isArray(backup.customers)),
    );
  } catch {
    return [];
  }
}

export function saveCustomerBackup<T = unknown>(
  customers: T[],
  storage?: StorageLike,
  now = new Date(),
): CustomerBackup<T>[] {
  if (!storage) return [];

  const existing = readCustomerBackups<T>(storage);
  const serializedCustomers = JSON.stringify(customers);
  const latest = existing[0];
  const latestSerialized = latest ? JSON.stringify(latest.customers) : null;

  // Evita criar snapshots idênticos em cada renderização.
  if (latest && latestSerialized === serializedCustomers) return existing;

  const next: CustomerBackup<T>[] = [
    {
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now.toISOString(),
      customers: JSON.parse(serializedCustomers) as T[],
    },
    ...existing,
  ].slice(0, MAX_BACKUPS);

  storage.setItem(CUSTOMER_BACKUPS_KEY, JSON.stringify(next));
  return next;
}

export function restoreCustomerBackup<T = unknown>(backup: CustomerBackup<T>, storage?: StorageLike): T[] {
  const customers = JSON.parse(JSON.stringify(backup.customers)) as T[];
  storage?.setItem("customers", JSON.stringify(customers));
  return customers;
}
