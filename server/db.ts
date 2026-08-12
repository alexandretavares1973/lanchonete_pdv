import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, cashierResponsibles, products, weeklyMenus, menuItems, cashierSessions, orders, orderItems, stockHistory, customers, localUsers } from "../drizzle/schema";
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
  
  // Inserir o pedido e obter o insertId com segurança
  const [insertResult] = await db.insert(orders).values(data);
  const orderId = (insertResult as any).insertId;
  
  if (!orderId) {
    throw new Error("Failed to retrieve created order ID");
  }
  
  const createdOrder = await db.select().from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  
  if (createdOrder.length === 0) {
    throw new Error("Failed to retrieve created order");
  }
  
  return createdOrder[0];
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


/**
 * Funções para Clientes
 */
export async function getAllCustomers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDefaultCustomer() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.name, "GERAL")).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCustomer(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(customers).values(data);
  return result;
}

export async function updateCustomer(id: number, data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(customers).set(data).where(eq(customers.id, id));
}

export async function deleteCustomer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(customers).where(eq(customers.id, id));
}

export async function getOrdersByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
}

export async function getOrdersWithCustomersByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    order: orders,
    customer: customers
  }).from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(and(
      sql`${orders.createdAt} >= ${startDate}`,
      sql`${orders.createdAt} <= ${endDate}`
    ))
    .orderBy(desc(orders.createdAt));
}


/**
 * Funções para Usuários Locais
 */
export async function getLocalUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(localUsers).where(eq(localUsers.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLocalUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(localUsers).where(eq(localUsers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLocalUser(data: { username: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(localUsers).values(data);
  return result;
}


export async function updateLocalUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(localUsers).set({ passwordHash }).where(eq(localUsers.id, userId));
}


/**
 * Operações de pós-venda: correção de pagamento e estorno.
 * O estorno é executado em uma transação para que o pedido, estoque e histórico
 * permaneçam consistentes mesmo se uma das etapas falhar.
 */
export async function getOrderById(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateOrderPaymentMethod(
  orderId: number,
  paymentMethod: "pix" | "card" | "cash"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(orders).set({ paymentMethod }).where(eq(orders.id, orderId));
  return await getOrderById(orderId);
}

export async function getCashierSessionById(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cashierSessions).where(eq(cashierSessions.id, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Retorna o cardápio somente quando há uma associação inequívoca por responsável e data. */
export async function getWeeklyMenuForCashierSession(responsibleId: number, openedAt: Date) {
  const db = await getDb();
  if (!db) return undefined;
  const dateStr = openedAt.toISOString().split("T")[0];
  const result = await db.select().from(weeklyMenus).where(and(
    eq(weeklyMenus.responsibleId, responsibleId),
    eq(weeklyMenus.saturdayDate, dateStr as any),
  )).limit(2);
  return result.length === 1 ? result[0] : undefined;
}

export async function cancelOrder(orderId: number, reason = "Estorno") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const orderRows = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const order = orderRows[0];
    if (!order) {
      return { ok: false as const, code: "NOT_FOUND" as const };
    }
    if (order.status !== "completed") {
      return {
        ok: false as const,
        code: "INVALID_STATUS" as const,
        status: order.status,
      };
    }

    // Atualização condicional: em chamadas concorrentes apenas a primeira pode estornar.
    const updateResult: any = await tx.update(orders)
      .set({ status: "cancelled" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "completed")));
    const affectedRows = updateResult?.affectedRows ?? updateResult?.rowsAffected ?? 1;
    if (affectedRows === 0) {
      return { ok: false as const, code: "ALREADY_PROCESSED" as const };
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const sessionRows = await tx.select().from(cashierSessions)
      .where(eq(cashierSessions.id, order.cashierSessionId))
      .limit(1);
    const session = sessionRows[0];
    const menu = session
      ? await getWeeklyMenuForCashierSession(session.responsibleId, session.openedAt)
      : undefined;

    for (const item of items) {
      const productRows = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
      const product = productRows[0];

      if (product && !product.isUnlimited && product.quantity !== null) {
        const restoredQuantity = product.quantity + item.quantity;
        await tx.update(products).set({
          quantity: restoredQuantity,
          isAvailable: restoredQuantity > 0,
        }).where(eq(products.id, item.productId));
      }

      await tx.insert(stockHistory).values({
        productId: item.productId,
        orderId,
        quantityChange: Math.abs(item.quantity),
        reason: reason.trim() || "Estorno",
      });

      if (menu) {
        const menuItemRows = await tx.select().from(menuItems).where(and(
          eq(menuItems.menuId, menu.id),
          eq(menuItems.productId, item.productId),
        )).limit(1);
        const menuItem = menuItemRows[0];
        if (menuItem) {
          const restoredMenuQuantity = menuItem.availableQuantity === null
            ? null
            : menuItem.availableQuantity + item.quantity;
          await tx.update(menuItems).set({
            availableQuantity: restoredMenuQuantity,
            isAvailable: restoredMenuQuantity === null ? true : restoredMenuQuantity > 0,
          }).where(eq(menuItems.id, menuItem.id));
        }
      }
    }

    const updatedOrderRows = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    return {
      ok: true as const,
      order: updatedOrderRows[0],
      items,
    };
  });
}
