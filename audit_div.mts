import { getDb } from './server/db';
import { products, weeklyMenus, menuItems } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }
  const allProducts = await db.select().from(products);
  const productMap = new Map(allProducts.map(p => [p.id, p]));

  const menus = await db.select().from(weeklyMenus);
  for (const menu of menus) {
    const items = await db.select().from(menuItems).where(eq(menuItems.menuId, menu.id));
    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (prod && prod.quantity !== null && item.availableQuantity !== null && item.availableQuantity > prod.quantity) {
        console.log(`DIVERGÊNCIA: Menu #${menu.id} -> Produto #${prod.id} (${prod.name}): global = ${prod.quantity}, cardápio = ${item.availableQuantity}`);
      }
    }
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
