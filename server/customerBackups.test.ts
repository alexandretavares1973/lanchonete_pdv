import { describe, expect, it } from "vitest";
import {
  CUSTOMER_BACKUPS_KEY,
  readCustomerBackups,
  restoreCustomerBackup,
  saveCustomerBackup,
} from "../client/src/lib/customerBackups";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("Backups automáticos de clientes", () => {
  it("deve criar snapshot datado e evitar duplicação idêntica", () => {
    const storage = createMemoryStorage();
    const customers = [{ id: 1, name: "GERAL" }];
    const first = saveCustomerBackup(customers, storage, new Date("2026-08-13T10:00:00.000Z"));
    const second = saveCustomerBackup(customers, storage, new Date("2026-08-13T10:01:00.000Z"));

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(second[0].createdAt).toBe("2026-08-13T10:00:00.000Z");
    expect(storage.getItem(CUSTOMER_BACKUPS_KEY)).toContain("GERAL");
  });

  it("deve manter no máximo 10 snapshots", () => {
    const storage = createMemoryStorage();
    for (let index = 0; index < 12; index += 1) {
      saveCustomerBackup([{ id: index, name: `Cliente ${index}` }], storage, new Date(2026, 7, 13, 10, index));
    }

    const backups = readCustomerBackups(storage);
    expect(backups).toHaveLength(10);
    expect(backups[0].customers[0]).toMatchObject({ id: 11 });
    expect(backups[9].customers[0]).toMatchObject({ id: 2 });
  });

  it("deve restaurar clientes do snapshot e persistir a lista principal", () => {
    const storage = createMemoryStorage();
    const backup = saveCustomerBackup([{ id: 4, name: "Ana" }], storage, new Date("2026-08-13T10:00:00.000Z"))[0];
    const restored = restoreCustomerBackup(backup, storage);

    expect(restored).toEqual([{ id: 4, name: "Ana" }]);
    expect(JSON.parse(storage.getItem("customers") || "[]")).toEqual(restored);
  });
});
