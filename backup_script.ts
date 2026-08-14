import { getDb } from "./server/db";
import * as fs from "fs";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Database unavailable");
    process.exit(1);
  }
  const [stockHistoryData, orderItemsData, ordersData, cashierSessionsData, refundAuditsData] = await Promise.all([
    db.execute("SELECT * FROM stock_history"),
    db.execute("SELECT * FROM order_items"),
    db.execute("SELECT * FROM orders"),
    db.execute("SELECT * FROM cashier_sessions"),
    db.execute("SELECT * FROM refund_audits")
  ]);

  const backup = {
    timestamp: new Date().toISOString(),
    stock_history: stockHistoryData[0],
    order_items: orderItemsData[0],
    orders: ordersData[0],
    cashier_sessions: cashierSessionsData[0],
    refund_audits: refundAuditsData[0],
  };

  fs.writeFileSync("/home/ubuntu/lanchonete_pdv/backup_vendas_2026_08_14.json", JSON.stringify(backup, null, 2));
  console.log("BACKUP COMPLETO GERADO COM SUCESSO: /home/ubuntu/lanchonete_pdv/backup_vendas_2026_08_14.json");
  console.log("Linhas - stock_history:", (stockHistoryData[0] as any).length);
  console.log("Linhas - order_items:", (orderItemsData[0] as any).length);
  console.log("Linhas - orders:", (ordersData[0] as any).length);
  console.log("Linhas - cashier_sessions:", (cashierSessionsData[0] as any).length);
  console.log("Linhas - refund_audits:", (refundAuditsData[0] as any).length);
  process.exit(0);
}

run().catch((err) => {
  console.error("Erro no backup:", err);
  process.exit(1);
});
