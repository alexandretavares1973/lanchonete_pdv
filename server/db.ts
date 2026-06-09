import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, cashierResponsibles, products, weeklyMenus, menuItems, cashierSessions, orders, orderItems, stockHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Funções para Responsáveis pelo Caixa
 */
export async function getCashierResponsibleByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cashierResponsibles).where(eq(cashierResponsibles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCashierResponsible(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cashierResponsibles).values(data);
  return result;
}

/**
 * Funções para Produtos
 */
export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(products);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProduct(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(products).values(data);
  return result;
}

export async function updateProduct(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(products).set(data).where(eq(products.id, id));
}

/**
 * Funções para Cardápio Semanal
 */
export async function getWeeklyMenuByDate(saturdayDate: Date | string) {
  const db = await getDb();
  if (!db) return undefined;
  const dateStr = typeof saturdayDate === 'string' ? saturdayDate : saturdayDate.toISOString().split('T')[0];
  const result = await db.select().from(weeklyMenus).where(eq(weeklyMenus.saturdayDate, dateStr as any)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createWeeklyMenu(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(weeklyMenus).values(data);
  return result;
}

export async function getMenuItemsByMenuId(menuId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(menuItems).where(eq(menuItems.menuId, menuId));
}

export async function createMenuItem(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(menuItems).values(data);
}

export async function updateMenuItem(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(menuItems).set(data).where(eq(menuItems.id, id));
}

/**
 * Funções para Sessão de Caixa
 */
export async function createCashierSession(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(cashierSessions).values(data);
}

export async function getOpenCashierSession(responsibleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cashierSessions)
    .where(and(eq(cashierSessions.responsibleId, responsibleId), eq(cashierSessions.status, "open")))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function closeCashierSession(id: number, finalBalance: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(cashierSessions).set({
    status: "closed",
    closedAt: new Date(),
    finalBalance: finalBalance
  }).where(eq(cashierSessions.id, id));
}

/**
 * Funções para Pedidos
 */
export async function createOrder(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(orders).values(data);
  return result;
}

export async function createOrderItem(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(orderItems).values(data);
}

export async function getOrdersByCashierSession(cashierSessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).where(eq(orders.cashierSessionId, cashierSessionId));
}

export async function getOrderItemsByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

/**
 * Funções para Histórico de Estoque
 */
export async function createStockHistory(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(stockHistory).values(data);
}
