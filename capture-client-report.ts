import { getAllCashierSessionsWithOrders } from "./server/db";

const sessions = await getAllCashierSessionsWithOrders();
const candidates = sessions.filter((session: any) => Array.isArray(session.orders) && session.orders.length > 0);
const selected = candidates.find((session: any) => session.orders.some((order: any) => Number(order.id) === 300002)) ?? candidates[0] ?? null;

const payload = {
  capturedAt: new Date().toISOString(),
  source: "server/db.ts:getAllCashierSessionsWithOrders",
  endpoint: "pdv.cashier.getAllSessionsWithOrders",
  session: selected,
  customerFields: selected?.orders?.map((order: any) => ({
    orderId: order.id,
    customerId: order.customerId ?? null,
    customerName: order.customerName ?? null,
  })) ?? [],
};

process.stdout.write(JSON.stringify(payload, null, 2));
