import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("Database unavailable");
    process.exit(1);
  }

  console.log("Iniciando limpeza na ordem estrita solicitada...");

  // 1. stock_history
  await db.execute(sql`DELETE FROM stock_history`);
  console.log("✔ Tabela stock_history limpa.");

  // 2. order_items
  await db.execute(sql`DELETE FROM order_items`);
  console.log("✔ Tabela order_items limpa.");

  // 3. orders
  await db.execute(sql`DELETE FROM orders`);
  console.log("✔ Tabela orders limpa.");

  // 4. cashier_sessions
  await db.execute(sql`DELETE FROM cashier_sessions`);
  console.log("✔ Tabela cashier_sessions limpa.");

  // 5. Atualizar produtos finitos para 50 unidades e isAvailable = true
  await db.execute(sql`UPDATE products SET quantity = 50, isAvailable = 1 WHERE isUnlimited = 0`);
  console.log("✔ Produtos finitos atualizados para 50 unidades.");

  // 6. Atualizar menu_items vinculados a produtos finitos para 50 unidades
  await db.execute(sql`
    UPDATE menu_items mi
    JOIN products p ON mi.productId = p.id
    SET mi.availableQuantity = 50, mi.isAvailable = 1
    WHERE p.isUnlimited = 0
  `);
  console.log("✔ Itens de cardápio atualizados para 50 unidades.");

  // 7. Validação das contagens finais
  const [shCount] = await db.execute(sql`SELECT COUNT(*) as cnt FROM stock_history`);
  const [oiCount] = await db.execute(sql`SELECT COUNT(*) as cnt FROM order_items`);
  const [oCount] = await db.execute(sql`SELECT COUNT(*) as cnt FROM orders`);
  const [csCount] = await db.execute(sql`SELECT COUNT(*) as cnt FROM cashier_sessions`);

  console.log("\n=== CONTAGENS FINAIS DAS TABELAS DE VENDAS ===");
  console.log("stock_history:", (shCount as any)[0].cnt);
  console.log("order_items:", (oiCount as any)[0].cnt);
  console.log("orders:", (oCount as any)[0].cnt);
  console.log("cashier_sessions:", (csCount as any)[0].cnt);

  process.exit(0);
}

run().catch((err) => {
  console.error("Erro na limpeza:", err);
  process.exit(1);
});
