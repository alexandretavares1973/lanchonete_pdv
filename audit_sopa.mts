import { getDb } from './server/db';
import { products, weeklyMenus, menuItems } from './drizzle/schema';
import { eq, like } from 'drizzle-orm';

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("No database connection");
    process.exit(1);
  }

  const sopas = await db.select().from(products).where(like(products.name, '%SOPA%'));
  console.log('--- PRODUCTS (SOPA) ---', JSON.stringify(sopas, null, 2));

  const menus = await db.select().from(weeklyMenus);
  console.log('--- WEEKLY MENUS ---', JSON.stringify(menus, null, 2));

  for (const menu of menus) {
    const items = await db.select().from(menuItems).where(eq(menuItems.menuId, menu.id));
    console.log(`--- MENU ITEMS FOR MENU ID ${menu.id} ---`, JSON.stringify(items, null, 2));
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
