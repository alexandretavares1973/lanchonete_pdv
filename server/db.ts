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
  responsibleName?: string;
  responsibleCpf?: string;
  responsiblePhone?: string;
  openedAt?: string;
  closedAt?: string | null;
  orders: LegacyOrderInput[];
}

export interface LegacySyncActor {
  userId: number;
  username: string;
}

const MYSQL_INT_MAX = 2147483647;

export function getSafeLegacyResponsibleId(value: unknown): number | null {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numericValue) || numericValue <= 0 || numericValue > MYSQL_INT_MAX) return null;
  return numericValue;
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

async function resolveLegacyResponsible(tx: any, legacySession: LegacySessionInput, actor: LegacySyncActor): Promise<number | null> {
  const responsibleName = legacySession.responsibleName?.trim() || null;
  if (responsibleName) {
    const nameRows = await tx.select().from(cashierResponsibles).where(eq(cashierResponsibles.name, responsibleName)).limit(1);
    if (nameRows[0]) return nameRows[0].id;
  }

  const cpf = legacySession.responsibleCpf?.trim() || null;
  if (cpf) {
    const cpfRows = await tx.select().from(cashierResponsibles).where(eq(cashierResponsibles.cpf, cpf)).limit(1);
    if (cpfRows[0]) return cpfRows[0].id;
  }

  // Nunca confiar no número vindo do localStorage: ele pode ser Date.now() e não é uma chave oficial.
  // A sessão legada é vinculada por identidade (nome/CPF) ou pelo usuário autenticado.
  const actorRows = await tx.select().from(cashierResponsibles).where(eq(cashierResponsibles.userId, actor.userId)).limit(1);
  if (actorRows[0]) return actorRows[0].id;

  const finalResponsibleName = responsibleName || actor.username.trim() || "Operador importado";
  const [responsibleResult] = await tx.insert(cashierResponsibles).values({
    userId: actor.userId,
    name: finalResponsibleName,
    cpf,
    phone: legacySession.responsiblePhone?.trim() || null,
  });
  const officialId = getSafeLegacyResponsibleId((responsibleResult as any)?.insertId);
  if (!officialId) return null;
  return officialId;
}

export async function syncLegacySessions(sessions: LegacySessionInput[], actor: LegacySyncActor): Promise<LegacySyncResult> {
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
        const responsibleId = await resolveLegacyResponsible(tx, legacySession, actor) || fallbackResponsible?.id;
        const officialResponsibleId = getSafeLegacyResponsibleId(responsibleId);
        if (!officialResponsibleId) {
          console.warn("[LegacySync] Sessão ignorada: nenhum responsável oficial foi resolvido", {
            legacySessionId: legacySession.id,
            legacyResponsibleId: legacySession.responsibleId,
            responsibleName: legacySession.responsibleName,
          });
          continue;
        }
        console.info("[LegacySync] Responsável resolvido", {
          legacySessionId: legacySession.id,
          legacyResponsibleId: legacySession.responsibleId,
          officialResponsibleId,
        });
        const openedAt = parseLegacyDate(legacySession.openedAt, new Date());
        const [sessionResult] = await tx.insert(cashierSessions).values({
          responsibleId: officialResponsibleId,
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
          // Se o produto não for encontrado, não criar com isUnlimited=true. Pular o item para evitar corromper o estoque.
          if (!product) {
            console.warn(`[LegacySync] Produto não cadastrado encontrado na importação: "${productName}". Item ignorado.`);
            continue;
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


export interface TestDataActor {
  userId: number;
  username: string;
}

export interface GeneratedTestDataSnapshot {
  products: Array<{ id: number; name: string; price: number; quantity: number; isUnlimited: boolean; isAvailable: boolean }>;
  customers: Array<{ id: number; name: string; phone: string | null; email: string | null; isDefault: boolean; isActive: boolean; createdAt: Date }>;
  responsible: { id: number; name: string; cpf: string; phone: string };
  weeklyMenus: Array<{
    id: number;
    saturdayDate: string;
    saturdayOrder: number;
    responsibleId: number;
    responsibleName: string;
    status: "open" | "closed";
    items: Array<{ id: string; productName: string; price: number; quantity: number | null; isUnlimited: boolean; isAvailable: boolean }>;
  }>;
  cashierSessions: Array<{
    id: number;
    legacyId: string;
    weeklyMenuId: number;
    responsibleId: number;
    openedAt: string;
    closedAt: string | null;
    orders: Array<{
      id: number;
      legacyId: string;
      paymentMethod: "pix" | "card" | "cash";
      total: number;
      status: "completed";
      customerId: number;
      customerName: string;
      createdAt: string;
      items: Array<{ productId: number; productName: string; quantity: number; price: number; unitPrice: number; subtotal: number }>;
    }>;
  }>;
}

export interface GeneratedTestDataResult {
  batchId: string;
  summary: { products: number; customers: number; orders: number; items: number; totalSales: number };
  snapshot: GeneratedTestDataSnapshot;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getSaturdayDate(baseDate: Date): Date {
  const date = new Date(baseDate);
  const daysSinceSaturday = (date.getUTCDay() + 1) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceSaturday);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

export function getTestDataBlueprint() {
  return {
    products: [
      { name: "Teste - Hambúrguer Clássico", price: 22.9, description: "Produto fictício para validação do PDV" },
      { name: "Teste - X-Salada", price: 26.5, description: "Produto fictício para validação do PDV" },
      { name: "Teste - Batata Frita", price: 12, description: "Produto fictício para validação do PDV" },
      { name: "Teste - Coxinha", price: 7.5, description: "Produto fictício para validação do PDV" },
      { name: "Teste - Refrigerante Lata", price: 6, description: "Produto fictício para validação do PDV" },
      { name: "Teste - Suco Natural", price: 9.5, description: "Produto fictício para validação do PDV" },
    ],
    customers: [
      { name: "Cliente Teste Ana", phone: "(11) 99999-1001", email: "ana@teste.local" },
      { name: "Cliente Teste Bruno", phone: "(11) 99999-1002", email: "bruno@teste.local" },
      { name: "Cliente Teste Carla", phone: "(11) 99999-1003", email: "carla@teste.local" },
    ],
    orders: [
      { paymentMethod: "pix" as const, customerIndex: 0, dayOffset: 4, items: [{ productIndex: 0, quantity: 1 }, { productIndex: 1, quantity: 1 }] },
      { paymentMethod: "card" as const, customerIndex: 1, dayOffset: 3, items: [{ productIndex: 2, quantity: 2 }, { productIndex: 3, quantity: 1 }] },
      { paymentMethod: "cash" as const, customerIndex: 2, dayOffset: 2, items: [{ productIndex: 0, quantity: 1 }, { productIndex: 4, quantity: 2 }] },
      { paymentMethod: "pix" as const, customerIndex: 3, dayOffset: 1, items: [{ productIndex: 1, quantity: 1 }, { productIndex: 5, quantity: 1 }] },
      { paymentMethod: "cash" as const, customerIndex: 1, dayOffset: 0, items: [{ productIndex: 0, quantity: 2 }, { productIndex: 2, quantity: 1 }, { productIndex: 4, quantity: 1 }] },
    ],
  };
}

export async function generateTestData(actor: TestDataActor): Promise<GeneratedTestDataResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async (tx) => {
    const now = new Date();
    const batchId = `test-${now.getTime()}`;
    const suffix = batchId.slice(-6);
    const initialStock = 50;
    const initialBalance = 100;

    let responsibleRows = await tx.select().from(cashierResponsibles).where(eq(cashierResponsibles.userId, actor.userId)).limit(1);
    let responsible = responsibleRows[0];
    if (!responsible) {
      const [responsibleResult] = await tx.insert(cashierResponsibles).values({
        userId: actor.userId,
        name: actor.username || "Operador de teste",
        cpf: null,
        phone: null,
      });
      const responsibleId = Number((responsibleResult as any)?.insertId || 0);
      responsibleRows = await tx.select().from(cashierResponsibles).where(eq(cashierResponsibles.id, responsibleId)).limit(1);
      responsible = responsibleRows[0];
    }
    if (!responsible) throw new Error("Não foi possível preparar o responsável pelo caixa para os dados de teste.");

    let defaultCustomerRows = await tx.select().from(customers).where(eq(customers.name, "GERAL")).limit(1);
    let defaultCustomer = defaultCustomerRows[0];
    if (!defaultCustomer) {
      const [customerResult] = await tx.insert(customers).values({
        name: "GERAL",
        phone: null,
        email: null,
        isActive: true,
      });
      const customerId = Number((customerResult as any)?.insertId || 0);
      defaultCustomerRows = await tx.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      defaultCustomer = defaultCustomerRows[0];
    }
    if (!defaultCustomer) throw new Error("Não foi possível preparar o cliente GERAL para os dados de teste.");

    const blueprint = getTestDataBlueprint();
    const testCustomerSpecs = blueprint.customers.map((customer) => ({
      ...customer,
      name: `${customer.name} ${suffix}`,
      email: customer.email.replace("@", `.${suffix}@`),
    }));
    const generatedCustomers = [defaultCustomer];
    for (const customerSpec of testCustomerSpecs) {
      const [customerResult] = await tx.insert(customers).values({
        ...customerSpec,
        isActive: true,
      });
      const customerId = Number((customerResult as any)?.insertId || 0);
      const customerRows = await tx.select().from(customers).where(eq(customers.id, customerId)).limit(1);
      if (customerRows[0]) generatedCustomers.push(customerRows[0]);
    }

    const productSpecs = blueprint.products.map((product) => ({
      ...product,
      name: `${product.name} ${suffix}`,
    }));
    const generatedProducts: Array<{ id: number; name: string; price: number; quantity: number; isUnlimited: boolean; isAvailable: boolean; description: string | null }> = [];
    for (const productSpec of productSpecs) {
      const [productResult] = await tx.insert(products).values({
        ...productSpec,
        price: productSpec.price.toFixed(2),
        quantity: initialStock,
        isUnlimited: false,
        isAvailable: true,
      });
      const productId = Number((productResult as any)?.insertId || 0);
      const productRows = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
      if (productRows[0]) generatedProducts.push({
        id: productRows[0].id,
        name: productRows[0].name,
        price: Number(productRows[0].price),
        quantity: productRows[0].quantity ?? initialStock,
        isUnlimited: productRows[0].isUnlimited,
        isAvailable: productRows[0].isAvailable,
        description: productRows[0].description,
      });
    }
    if (generatedProducts.length !== productSpecs.length) throw new Error("Não foi possível criar todos os produtos de teste.");

    let saturdayDate = getSaturdayDate(now);
    for (let attempts = 0; attempts < 52; attempts += 1) {
      const existingMenu = await tx.select().from(weeklyMenus).where(eq(weeklyMenus.saturdayDate, formatDateOnly(saturdayDate) as any)).limit(1);
      if (existingMenu.length === 0) break;
      saturdayDate = new Date(saturdayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    const [menuResult] = await tx.insert(weeklyMenus).values({
      saturdayDate: formatDateOnly(saturdayDate) as any,
      saturdayOrder: Math.floor((saturdayDate.getUTCDate() - 1) / 7) + 1,
      responsibleId: responsible.id,
      status: "open",
    });
    const menuId = Number((menuResult as any)?.insertId || 0);
    if (!menuId) throw new Error("Não foi possível criar o cardápio de teste.");

    const menuItemIds: number[] = [];
    for (const product of generatedProducts) {
      const [menuItemResult] = await tx.insert(menuItems).values({
        menuId,
        productId: product.id,
        availableQuantity: initialStock,
        isAvailable: true,
      });
      menuItemIds.push(Number((menuItemResult as any)?.insertId || 0));
    }

    const legacySessionId = `test-session-${batchId}`;
    const openedAt = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const closedAt = new Date(now.getTime() - 30 * 60 * 1000);
    const [sessionResult] = await tx.insert(cashierSessions).values({
      responsibleId: responsible.id,
      openedAt,
      closedAt,
      initialBalance: initialBalance.toFixed(2),
      finalBalance: initialBalance.toFixed(2),
      status: "closed",
    });
    const sessionId = Number((sessionResult as any)?.insertId || 0);
    if (!sessionId) throw new Error("Não foi possível criar a sessão de caixa de teste.");

    const orderSpecs = blueprint.orders.map((order) => ({
      ...order,
      customer: order.customerIndex === 0 ? defaultCustomer : generatedCustomers[order.customerIndex],
    }));
    const remainingStock = new Map(generatedProducts.map((product) => [product.id, initialStock]));
    const remainingMenuStock = new Map(generatedProducts.map((product, index) => [index, initialStock]));
    const generatedOrders: GeneratedTestDataSnapshot["cashierSessions"][number]["orders"] = [];
    let totalSales = 0;
    let totalItems = 0;

    for (let index = 0; index < orderSpecs.length; index += 1) {
      const orderSpec = orderSpecs[index];
      const createdAt = new Date(now.getTime() - orderSpec.dayOffset * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000);
      const resolvedItems = orderSpec.items.map((item) => {
        const product = generatedProducts[item.productIndex];
        const subtotal = product.price * item.quantity;
        return {
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          price: product.price,
          unitPrice: product.price,
          subtotal,
        };
      });
      const total = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const legacyOrderId = `test-order-${batchId}-${index + 1}`;
      const [orderResult] = await tx.insert(orders).values({
        cashierSessionId: sessionId,
        customerId: orderSpec.customer.id,
        totalAmount: total.toFixed(2),
        paymentMethod: orderSpec.paymentMethod,
        status: "completed",
        legacyKey: `local:${legacySessionId}:${legacyOrderId}`,
        createdAt,
      });
      const orderId = Number((orderResult as any)?.insertId || 0);
      if (!orderId) throw new Error("Não foi possível criar um pedido de teste.");

      for (const item of resolvedItems) {
        await tx.insert(orderItems).values({
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          subtotal: item.subtotal.toFixed(2),
        });
        await tx.insert(stockHistory).values({
          productId: item.productId,
          orderId,
          quantityChange: -item.quantity,
          reason: `Dados de teste ${batchId}`,
        });
        remainingStock.set(item.productId, (remainingStock.get(item.productId) || initialStock) - item.quantity);
        const productIndex = generatedProducts.findIndex((product) => product.id === item.productId);
        remainingMenuStock.set(productIndex, (remainingMenuStock.get(productIndex) || initialStock) - item.quantity);
        totalItems += item.quantity;
      }

      generatedOrders.push({
        id: orderId,
        legacyId: legacyOrderId,
        paymentMethod: orderSpec.paymentMethod,
        total,
        status: "completed",
        customerId: orderSpec.customer.id,
        customerName: orderSpec.customer.name,
        createdAt: createdAt.toISOString(),
        items: resolvedItems,
      });
      totalSales += total;
    }

    for (const product of generatedProducts) {
      const quantity = remainingStock.get(product.id) || 0;
      await tx.update(products).set({ quantity, isAvailable: quantity > 0 }).where(eq(products.id, product.id));
      product.quantity = quantity;
      product.isAvailable = quantity > 0;
    }
    for (let index = 0; index < menuItemIds.length; index += 1) {
      const availableQuantity = remainingMenuStock.get(index) || 0;
      await tx.update(menuItems).set({ availableQuantity, isAvailable: availableQuantity > 0 }).where(eq(menuItems.id, menuItemIds[index]));
    }
    await tx.update(cashierSessions).set({ finalBalance: (initialBalance + totalSales).toFixed(2) }).where(eq(cashierSessions.id, sessionId));

    const snapshot: GeneratedTestDataSnapshot = {
      products: generatedProducts.map(({ id, name, price, quantity, isUnlimited, isAvailable }) => ({ id, name, price, quantity, isUnlimited, isAvailable })),
      customers: generatedCustomers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isDefault: customer.name === "GERAL",
        isActive: customer.isActive,
        createdAt: customer.createdAt,
      })),
      responsible: {
        id: responsible.id,
        name: responsible.name,
        cpf: responsible.cpf || "",
        phone: responsible.phone || "",
      },
      weeklyMenus: [{
        id: menuId,
        saturdayDate: formatDateOnly(saturdayDate),
        saturdayOrder: Math.floor((saturdayDate.getUTCDate() - 1) / 7) + 1,
        responsibleId: responsible.id,
        responsibleName: responsible.name,
        status: "open",
        items: generatedProducts.map((product, index) => ({
          id: String(product.id),
          productName: product.name,
          price: product.price,
          quantity: remainingMenuStock.get(index) || 0,
          isUnlimited: false,
          isAvailable: (remainingMenuStock.get(index) || 0) > 0,
        })),
      }],
      cashierSessions: [{
        id: sessionId,
        legacyId: legacySessionId,
        weeklyMenuId: menuId,
        responsibleId: responsible.id,
        openedAt: openedAt.toISOString(),
        closedAt: closedAt.toISOString(),
        orders: generatedOrders,
      }],
    };

    return {
      batchId,
      summary: {
        products: generatedProducts.length,
        customers: generatedCustomers.length,
        orders: generatedOrders.length,
        items: totalItems,
        totalSales: Number(totalSales.toFixed(2)),
      },
      snapshot,
    };
  });
}

export async function refundOrderItems(
  orderId: number,
  itemsToRefund: Array<{ orderItemId: number; quantity: number }>,
  reason: string,
  user: { id: number; username?: string | null; name?: string | null; email?: string | null }
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
      return { ok: false as const, code: "INVALID_STATUS" as const, status: order.status };
    }

    const allOrderItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const orderItemMap = new Map(allOrderItems.map((item) => [item.id, item]));

    // Validar itens e quantidades
    for (const reqItem of itemsToRefund) {
      if (reqItem.quantity <= 0) continue;
      const dbItem = orderItemMap.get(reqItem.orderItemId);
      if (!dbItem || dbItem.orderId !== orderId) {
        return { ok: false as const, code: "ITEM_NOT_FOUND" as const, orderItemId: reqItem.orderItemId };
      }
      const remainingRefundable = dbItem.quantity - dbItem.refundedQuantity;
      if (reqItem.quantity > remainingRefundable) {
        return {
          ok: false as const,
          code: "EXCEEDS_QUANTITY" as const,
          orderItemId: reqItem.orderItemId,
          maxAllowed: remainingRefundable,
        };
      }
    }

    const sessionRows = await tx.select().from(cashierSessions)
      .where(eq(cashierSessions.id, order.cashierSessionId))
      .limit(1);
    const session = sessionRows[0];
    let menu = session
      ? await getWeeklyMenuForCashierSession(session.responsibleId, session.openedAt)
      : undefined;

    if (!menu && session) {
      const fallbackMenuRows = await tx.select().from(weeklyMenus).where(eq(weeklyMenus.responsibleId, session.responsibleId)).orderBy(desc(weeklyMenus.id)).limit(1);
      menu = fallbackMenuRows[0];
    }

    const auditedItems: Array<Record<string, unknown>> = [];

    for (const reqItem of itemsToRefund) {
      if (reqItem.quantity <= 0) continue;
      const dbItem = orderItemMap.get(reqItem.orderItemId)!;
      const productRows = await tx.select().from(products).where(eq(products.id, dbItem.productId)).limit(1);
      const product = productRows[0];
      const productName = product?.name || `Produto #${dbItem.productId}`;

      // Atualizar refundedQuantity
      const newRefunded = dbItem.refundedQuantity + reqItem.quantity;
      await tx.update(orderItems)
        .set({ refundedQuantity: newRefunded })
        .where(eq(orderItems.id, dbItem.id));

      auditedItems.push({
        productId: dbItem.productId,
        productName,
        quantity: reqItem.quantity,
        unitPrice: dbItem.unitPrice,
        subtotal: Number(dbItem.unitPrice) * reqItem.quantity,
      });

      // Devolver estoque global com fallback seguro
      if (product) {
        if (product.isUnlimited || product.quantity === null) {
          console.warn(`[StockWarning] Produto ID ${dbItem.productId} ("${productName}") possui estoque ilimitado ou nulo no estorno. Devolução de estoque ignorada.`);
        } else {
          const restoredQuantity = product.quantity + reqItem.quantity;
          await tx.update(products).set({
            quantity: restoredQuantity,
            isAvailable: restoredQuantity > 0,
          }).where(eq(products.id, dbItem.productId));
        }
      }

      // Registrar histórico de estoque
      await tx.insert(stockHistory).values({
        productId: dbItem.productId,
        orderId,
        quantityChange: reqItem.quantity,
        reason: reason.trim() || "Estorno parcial",
      });

      // Devolver ao cardápio semanal se aplicável
      if (menu) {
        const menuItemRows = await tx.select().from(menuItems).where(and(
          eq(menuItems.menuId, menu.id),
          eq(menuItems.productId, dbItem.productId),
        )).limit(1);
        const menuItem = menuItemRows[0];
        if (menuItem) {
          const restoredMenuQuantity = menuItem.availableQuantity === null
            ? null
            : menuItem.availableQuantity + reqItem.quantity;
          await tx.update(menuItems).set({
            availableQuantity: restoredMenuQuantity,
            isAvailable: restoredMenuQuantity === null ? true : restoredMenuQuantity > 0,
          }).where(eq(menuItems.id, menuItem.id));
        }
      }
    }

    // Verificar se todos os itens foram 100% estornados
    const refreshedOrderItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const allFullyRefunded = refreshedOrderItems.every((item) => item.refundedQuantity >= item.quantity);
    const newStatus = allFullyRefunded ? "cancelled" : "completed";

    await tx.update(orders)
      .set({ status: newStatus })
      .where(eq(orders.id, orderId));

    // Registrar auditoria se houve itens estornados
    if (auditedItems.length > 0) {
      const totalRefundedAmount = auditedItems.reduce((sum, i) => sum + Number(i.subtotal), 0);
      const auditReason = reason.trim() || (allFullyRefunded ? "Estorno total" : "Estorno parcial");
      const userName = user.name || user.username || user.email || `Usuário #${user.id}`;
      await tx.insert(refundAudits).values({
        orderId,
        userId: user.id,
        username: userName,
        loginMethod: "local_or_oauth",
        reason: auditReason,
        orderTotal: String(totalRefundedAmount),
        itemsSnapshot: JSON.stringify(auditedItems),
      });
    }

    return { ok: true as const, status: newStatus, refundedItemsCount: auditedItems.length };
  });
}
