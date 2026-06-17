import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de responsáveis pelo caixa
 */
export const cashierResponsibles = mysqlTable("cashier_responsibles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).unique(),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CashierResponsible = typeof cashierResponsibles.$inferSelect;
export type InsertCashierResponsible = typeof cashierResponsibles.$inferInsert;

/**
 * Tabela de produtos
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity"),
  isUnlimited: boolean("isUnlimited").default(false).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Tabela de cardápio semanal (sábados)
 */
export const weeklyMenus = mysqlTable("weekly_menus", {
  id: int("id").autoincrement().primaryKey(),
  saturdayDate: date("saturdayDate").notNull().unique(),
  saturdayOrder: int("saturdayOrder").notNull(), // 1º sábado, 2º sábado, etc.
  responsibleId: int("responsibleId"), // Responsável pelo cardápio
  status: mysqlEnum("status", ["open", "closed"]).default("closed").notNull(), // Status do cardápio
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WeeklyMenu = typeof weeklyMenus.$inferSelect;
export type InsertWeeklyMenu = typeof weeklyMenus.$inferInsert;

export interface WeeklyMenuWithResponsible extends WeeklyMenu {
  responsible?: CashierResponsible;
}

/**
 * Tabela de produtos no cardápio semanal
 */
export const menuItems = mysqlTable("menu_items", {
  id: int("id").autoincrement().primaryKey(),
  menuId: int("menuId").notNull(),
  productId: int("productId").notNull(),
  availableQuantity: int("availableQuantity"),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

/**
 * Tabela de controle de caixa
 */
export const cashierSessions = mysqlTable("cashier_sessions", {
  id: int("id").autoincrement().primaryKey(),
  responsibleId: int("responsibleId").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  initialBalance: decimal("initialBalance", { precision: 10, scale: 2 }).default("0"),
  finalBalance: decimal("finalBalance", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["open", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CashierSession = typeof cashierSessions.$inferSelect;
export type InsertCashierSession = typeof cashierSessions.$inferInsert;

/**
 * Tabela de clientes
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Tabela de pedidos
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  cashierSessionId: int("cashierSessionId").notNull(),
  customerId: int("customerId"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "card", "cash"]).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending").notNull(),
  printedAt: timestamp("printedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Tabela de itens do pedido
 */
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Tabela de histórico de estoque
 */
export const stockHistory = mysqlTable("stock_history", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  orderId: int("orderId"),
  quantityChange: int("quantityChange").notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StockHistory = typeof stockHistory.$inferSelect;
export type InsertStockHistory = typeof stockHistory.$inferInsert;

/**
 * Relação entre clientes e pedidos para relatório
 */
export interface OrderWithCustomer extends Order {
  customer?: Customer;
}