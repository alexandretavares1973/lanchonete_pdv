import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, cashierResponsibles, products, weeklyMenus, menuItems, cashierSessions, orders, orderItems, stockHistory, customers, localUsers, refundAudits } from "../drizzle/schema";
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

export interface RefundAuditActor {
  userId?: number | null;
  username: string;
  loginMethod: string;
}

export async function cancelOrder(
  orderId: number,
  reason = "Estorno",
  actor: RefundAuditActor = { username: "Sistema", loginMethod: "system", userId: null },
) {
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
    const auditItems: Array<Record<string, unknown>> = [];
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
      auditItems.push({
        productId: item.productId,
        productName: product?.name || `Produto #${item.productId}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      });

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

    const auditReason = reason.trim() || "Estorno";
    const [auditResult] = await tx.insert(refundAudits).values({
      orderId,
      userId: actor.userId ?? null,
      username: actor.username,
      loginMethod: actor.loginMethod,
      reason: auditReason,
      orderTotal: order.totalAmount,
      itemsSnapshot: JSON.stringify(auditItems),
    });

    const updatedOrderRows = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    return {
      ok: true as const,
      order: updatedOrderRows[0],
      items,
      auditId: Number((auditResult as any)?.insertId || 0),
    };
  });
}

export async function getRefundAuditsByOrderIds(orderIds: number[]) {
  const db = await getDb();
  if (!db || orderIds.length === 0) return [];
  return await db.select().from(refundAudits).where(inArray(refundAudits.orderId, orderIds)).orderBy(desc(refundAudits.createdAt));
}


export interface LegacyOrderItemInput {
  id?: string | number;
  productId?: number;
  productName: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  subtotal?: number;
}

export interface LegacyOrderInput {
  id: string | number;
  paymentMethod: "pix" | "card" | "cash";
  total?: number;
  status?: "pending" | "completed" | "cancelled";
  customerId?: number;
  customerName?: string;
  createdAt?: string;
  items: LegacyOrderItemInput[];
}

export interface LegacySessionInput {
  id: string | number;
  responsibleId?: number | null;
  openedAt?: string;
  closedAt?: string | null;
  orders: LegacyOrderInput[];
}

export interface LegacySyncResult {
  sessionsCreated: number;
  ordersCreated: number;
  ordersSkipped: number;
  sessionMappings: Array<{ legacySessionId: string | number; officialId: number }>;
  orderMappings: Array<{ legacyKey: string; officialId: number; legacyOrderId: string | number }>;
}

function parseLegacyDate(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function syncLegacySessions(sessions: LegacySessionInput[]): Promise<LegacySyncResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const result: LegacySyncResult = {
      sessionsCreated: 0,
      ordersCreated: 0,
      ordersSkipped: 0,
      sessionMappings: [],
      orderMappings: [],
    };

    const [fallbackResponsible] = await tx.select().from(cashierResponsibles).limit(1);

    for (const legacySession of sessions) {
      const legacyOrders = Array.isArray(legacySession.orders) ? legacySession.orders : [];
      const firstOrderKey = legacyOrders[0]
        ? `local:${String(legacySession.id)}:${String(legacyOrders[0].id)}`
        : null;
      let officialSessionId: number | null = null;

      if (firstOrderKey) {
        const existingFirstOrder = await tx.select().from(orders).where(eq(orders.legacyKey, firstOrderKey)).limit(1);
        officialSessionId = existingFirstOrder[0]?.cashierSessionId ?? null;
      }

      if (!officialSessionId) {
        const responsibleId = legacySession.responsibleId || fallbackResponsible?.id;
        if (!responsibleId) continue;
        const openedAt = parseLegacyDate(legacySession.openedAt, new Date());
        const [sessionResult] = await tx.insert(cashierSessions).values({
          responsibleId,
          openedAt,
          closedAt: legacySession.closedAt ? parseLegacyDate(legacySession.closedAt, openedAt) : null,
          initialBalance: "0",
          finalBalance: legacySession.closedAt ? "0" : null,
          status: legacySession.closedAt ? "closed" : "open",
        });
        officialSessionId = Number((sessionResult as any)?.insertId || 0);
        if (!officialSessionId) continue;
        result.sessionsCreated += 1;
      }

      if (officialSessionId) {
        result.sessionMappings.push({ legacySessionId: legacySession.id, officialId: officialSessionId });
      }

      for (const legacyOrder of legacyOrders) {
        const legacyKey = `local:${String(legacySession.id)}:${String(legacyOrder.id)}`;
        const existingOrder = await tx.select().from(orders).where(eq(orders.legacyKey, legacyKey)).limit(1);
        if (existingOrder[0]) {
          result.ordersSkipped += 1;
          result.orderMappings.push({ legacyKey, officialId: existingOrder[0].id, legacyOrderId: legacyOrder.id });
          continue;
        }

        let customerId: number | null = null;
        const customerName = legacyOrder.customerName?.trim();
        if (customerName) {
          const existingCustomer = await tx.select().from(customers).where(eq(customers.name, customerName)).limit(1);
          if (existingCustomer[0]) {
            customerId = existingCustomer[0].id;
          } else {
            const [customerResult] = await tx.insert(customers).values({
              name: customerName,
              isActive: true,
            });
            customerId = Number((customerResult as any)?.insertId || 0) || null;
          }
        }

        const resolvedItems: Array<{ productId: number; quantity: number; unitPrice: number; subtotal: number }> = [];
        for (const legacyItem of legacyOrder.items || []) {
          const productName = legacyItem.productName?.trim() || `Produto legado ${String(legacyItem.productId || legacyItem.id || "sem nome")}`;
          const unitPrice = Number(legacyItem.unitPrice ?? legacyItem.price ?? 0);
          const quantity = Math.max(1, Number(legacyItem.quantity || 1));
          const subtotal = Number(legacyItem.subtotal ?? unitPrice * quantity);
          let productRows = await tx.select().from(products).where(eq(products.name, productName)).limit(1);
          let product = productRows[0];
          if (!product) {
            const [productResult] = await tx.insert(products).values({
              name: productName,
              price: unitPrice.toFixed(2),
              quantity: null,
              isUnlimited: true,
              isAvailable: true,
              description: "Produto importado de pedido legado",
            });
            const productId = Number((productResult as any)?.insertId || 0);
            productRows = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
            product = productRows[0];
          }
          if (product) resolvedItems.push({ productId: product.id, quantity, unitPrice, subtotal });
        }

        if (resolvedItems.length === 0) continue;
        const totalAmount = Number(legacyOrder.total ?? resolvedItems.reduce((sum, item) => sum + item.subtotal, 0));
        const status = legacyOrder.status || "completed";
        const [orderResult] = await tx.insert(orders).values({
          cashierSessionId: officialSessionId,
          customerId,
          totalAmount: totalAmount.toFixed(2),
          paymentMethod: legacyOrder.paymentMethod,
          status,
          legacyKey,
          createdAt: parseLegacyDate(legacyOrder.createdAt, new Date()),
        });
        const officialOrderId = Number((orderResult as any)?.insertId || 0);
        if (!officialOrderId) continue;

        for (const item of resolvedItems) {
          await tx.insert(orderItems).values({
            orderId: officialOrderId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            subtotal: item.subtotal.toFixed(2),
          });

          if (status === "completed") {
            await tx.insert(stockHistory).values({
              productId: item.productId,
              orderId: officialOrderId,
              quantityChange: -item.quantity,
              reason: "Importação de pedido legado",
            });
            const productRows = await tx.select().from(products).where(eq(products.id, item.productId)).limit(1);
            const product = productRows[0];
            if (product && !product.isUnlimited && product.quantity !== null) {
              const nextQuantity = Math.max(0, product.quantity - item.quantity);
              await tx.update(products).set({
                quantity: nextQuantity,
                isAvailable: nextQuantity > 0,
              }).where(eq(products.id, item.productId));
            }
          }
        }

        result.ordersCreated += 1;
        result.orderMappings.push({ legacyKey, officialId: officialOrderId, legacyOrderId: legacyOrder.id });
      }
    }

    return result;
  });
}
