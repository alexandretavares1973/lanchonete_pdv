import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { publishRealtimeEvent } from "./realtime";

export const pdvRouter = router({
  // Produtos
  products: router({
    list: publicProcedure.query(async () => {
      return await db.getAllProducts();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProductById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          price: z.number(),
          quantity: z.number().min(0),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.createProduct({
          name: input.name,
          price: input.price,
          quantity: input.quantity,
          isUnlimited: false,
          description: input.description,
          isAvailable: true,
        });
        const productId = Number((result as any)?.insertId || 0);
        publishRealtimeEvent({ entity: "product", action: "created", ids: productId > 0 ? { productId } : undefined });
        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          price: z.number().optional(),
          quantity: z.number().min(0).optional(),
          isUnlimited: z.boolean().optional(), // mantido no input mas será ignorado se for true
          isAvailable: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, isUnlimited, ...data } = input;
        
        // Ignorar/rejeitar tentativas de setar isUnlimited=true
        const updateData: any = { ...data };
        if (isUnlimited !== undefined) {
          updateData.isUnlimited = false; // Forçar false ou ignorar o true
        }
        
        const result = await db.updateProduct(id, updateData);
        publishRealtimeEvent({ entity: "product", action: "updated", ids: { productId: id } });
        return result;
      }),
  }),

  // Cardápio Semanal — fonte única compartilhada no banco
  menu: router({
    list: publicProcedure.query(async () => db.getAllWeeklyMenus()),

    getByDate: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => db.getWeeklyMenuByDate(input.date)),

    create: protectedProcedure
      .input(z.object({
        saturdayDate: z.string(),
        saturdayOrder: z.number(),
        responsibleId: z.number().nullable().optional(),
        status: z.enum(["open", "closed"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createWeeklyMenu({
          saturdayDate: input.saturdayDate,
          saturdayOrder: input.saturdayOrder,
          responsibleId: input.responsibleId ?? null,
          status: input.status ?? "closed",
        });
        publishRealtimeEvent({ entity: "menu", action: "created", ids: { menuId: result.id } });
        return result;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        saturdayDate: z.string().optional(),
        saturdayOrder: z.number().optional(),
        responsibleId: z.number().nullable().optional(),
        status: z.enum(["open", "closed"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const result = await db.updateWeeklyMenu(id, data);
        publishRealtimeEvent({ entity: "menu", action: "updated", ids: { menuId: id } });
        return result;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const result = await db.deleteWeeklyMenu(input.id);
        publishRealtimeEvent({ entity: "menu", action: "deleted", ids: { menuId: input.id } });
        return result;
      }),

    syncLegacy: protectedProcedure
      .input(z.object({
        menus: z.array(z.object({
          saturdayDate: z.string(),
          saturdayOrder: z.number(),
          responsibleName: z.string().optional(),
          responsibleCpf: z.string().optional(),
          responsiblePhone: z.string().optional(),
          status: z.enum(["open", "closed"]).optional(),
          items: z.array(z.object({
            productId: z.number().optional(),
            productName: z.string().optional(),
            name: z.string().optional(),
            quantity: z.number().nullable().optional(),
            availableQuantity: z.number().nullable().optional(),
          })).optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => db.syncLegacyMenus(input.menus, {
        userId: ctx.user.id,
        username: ctx.user.name || ctx.user.email || `usuario-${ctx.user.id}`,
      })),

    addItem: protectedProcedure
      .input(z.object({
        menuId: z.number(),
        productId: z.number(),
        availableQuantity: z.number().min(0).nullable(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createMenuItem(input);
        publishRealtimeEvent({ entity: "menu", action: "updated", ids: { menuId: input.menuId, productId: input.productId } });
        return result;
      }),

    updateItem: protectedProcedure
      .input(z.object({
        menuItemId: z.number(),
        availableQuantity: z.number().min(0).nullable().optional(),
        isAvailable: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { menuItemId, ...data } = input;
        const result = await db.updateMenuItem(menuItemId, data);
        publishRealtimeEvent({ entity: "menu", action: "updated", ids: { menuItemId } });
        return result;
      }),

    updateItemAvailability: protectedProcedure
      .input(z.object({ menuItemId: z.number(), isAvailable: z.boolean() }))
      .mutation(async ({ input }) => {
        const result = await db.updateMenuItem(input.menuItemId, { isAvailable: input.isAvailable });
        publishRealtimeEvent({ entity: "menu", action: "updated", ids: { menuItemId: input.menuItemId } });
        return result;
      }),

    deleteItem: protectedProcedure
      .input(z.object({ menuItemId: z.number() }))
      .mutation(async ({ input }) => {
        const result = await db.deleteMenuItem(input.menuItemId);
        publishRealtimeEvent({ entity: "menu", action: "updated", ids: { menuItemId: input.menuItemId } });
        return result;
      }),

    getItems: publicProcedure
      .input(z.object({ menuId: z.number() }))
      .query(async ({ input }) => db.getMenuItemsByMenuId(input.menuId)),
  }),

  // Pedidos
  orders: router({
    create: protectedProcedure
      .input(
        z.object({
          cashierSessionId: z.number(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number(),
              unitPrice: z.number(),
            })
          ),
          paymentMethod: z.enum(["pix", "card", "cash"]),
          customerId: z.number().optional(),
          weeklyMenuId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const totalAmount = input.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );

        try {
          const orderResult = await db.createOrderWithInventory({
            cashierSessionId: input.cashierSessionId,
            totalAmount,
            paymentMethod: input.paymentMethod,
            customerId: input.customerId,
            weeklyMenuId: input.weeklyMenuId,
            items: input.items,
          });

          const orderId = orderResult.id;
          publishRealtimeEvent({
            entity: "order",
            action: "created",
            ids: {
              orderId: Number(orderId),
              cashierSessionId: input.cashierSessionId,
              ...(input.weeklyMenuId ? { menuId: input.weeklyMenuId } : {}),
            },
          });
          return orderResult;
        } catch (error) {
          const code = error instanceof Error ? error.message : "UNKNOWN";
          if (code === "SESSION_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Sessão de caixa não encontrada." });
          if (code === "SESSION_MENU_MISMATCH") throw new TRPCError({ code: "CONFLICT", message: "A sessão de caixa pertence a outro cardápio." });
          if (code === "MENU_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Cardápio não encontrado." });
          if (code === "MENU_CLOSED") throw new TRPCError({ code: "BAD_REQUEST", message: "O cardápio selecionado está fechado." });
          if (code.startsWith("MENU_ITEM_NOT_FOUND:")) throw new TRPCError({ code: "BAD_REQUEST", message: `O produto ${code.slice("MENU_ITEM_NOT_FOUND:".length)} não está cadastrado no cardápio selecionado.` });
          if (code.startsWith("INSUFFICIENT_STOCK:")) throw new TRPCError({ code: "CONFLICT", message: `Estoque global insuficiente para ${code.slice("INSUFFICIENT_STOCK:".length)}.` });
          if (code.startsWith("INSUFFICIENT_MENU_STOCK:")) throw new TRPCError({ code: "CONFLICT", message: `Quantidade insuficiente no cardápio para ${code.slice("INSUFFICIENT_MENU_STOCK:".length)}.` });
          if (code.startsWith("PRODUCT_NOT_FOUND:")) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado." });
          throw error;
        }
      }),

    getBySession: publicProcedure
      .input(z.object({ cashierSessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrdersByCashierSession(input.cashierSessionId);
      }),

    getItems: publicProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrderItemsByOrderId(input.orderId);
      }),

    updatePaymentMethod: protectedProcedure
      .input(z.object({
        orderId: z.number().int().positive(),
        paymentMethod: z.enum(["pix", "card", "cash"]),
      }))
      .mutation(async ({ input }) => {
        const order = await db.getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
        }
        if (order.status === "cancelled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível alterar o pagamento de um pedido cancelado." });
        }
        const result = await db.updateOrderPaymentMethod(input.orderId, input.paymentMethod);
        publishRealtimeEvent({ entity: "order", action: "updated", ids: { orderId: input.orderId } });
        return result;
      }),

    refundItems: protectedProcedure
      .input(z.object({
        orderId: z.number().int().positive(),
        items: z.array(z.object({
          orderItemId: z.number().int().positive(),
          quantity: z.number().int().nonnegative(),
        })),
        reason: z.string().trim().max(255).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.refundOrderItems(
          input.orderId,
          input.items,
          input.reason || "Estorno parcial",
          ctx.user
        );
        if (!result.ok) {
          if (result.code === "NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
          }
          if (result.code === "INVALID_STATUS") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Só é possível estornar pedidos concluídos. Status atual: ${result.status}.`,
            });
          }
          if (result.code === "ITEM_NOT_FOUND") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Item de pedido inválido ou não pertence a este pedido." });
          }
          if (result.code === "EXCEEDS_QUANTITY") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `A quantidade a estornar excede o saldo disponível para o item.`,
            });
          }
          throw new TRPCError({ code: "CONFLICT", message: "O pedido já foi processado por outra operação." });
        }
        publishRealtimeEvent({ entity: "order", action: "refunded", ids: { orderId: input.orderId } });
        return result;
      }),

    cancel: protectedProcedure
      .input(z.object({
        orderId: z.number().int().positive(),
        reason: z.string().trim().max(255).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Estorno do pedido inteiro via refundItems (estornando tudo que ainda falta)
        const items = await db.getOrderItemsByOrderId(input.orderId);
        const itemsToRefund = items.map((item) => ({
          orderItemId: item.id,
          quantity: item.quantity - (item.refundedQuantity || 0),
        })).filter((i) => i.quantity > 0);

        if (itemsToRefund.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este pedido já está totalmente estornado." });
        }

        const result = await db.refundOrderItems(
          input.orderId,
          itemsToRefund,
          input.reason || "Estorno",
          ctx.user
        );
        if (!result.ok) {
          if (result.code === "NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Pedido não encontrado." });
          }
          if (result.code === "INVALID_STATUS") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Só é possível estornar pedidos concluídos. Status atual: ${result.status}.`,
            });
          }
          throw new TRPCError({ code: "CONFLICT", message: "O pedido já foi processado por outra operação." });
        }
        publishRealtimeEvent({ entity: "order", action: "refunded", ids: { orderId: input.orderId } });
        return { ok: true, status: result.status };
      }),

    getRefundAudits: protectedProcedure
      .input(z.object({ orderIds: z.array(z.number().int().positive()).max(200) }))
      .query(async ({ input }) => {
        return await db.getRefundAuditsByOrderIds(input.orderIds);
      }),

    syncLegacy: protectedProcedure
      .input(z.object({
        sessions: z.array(z.object({
          id: z.union([z.string(), z.number()]),
          responsibleId: z.number().nullable().optional(),
          responsibleName: z.string().optional(),
          responsibleCpf: z.string().optional(),
          responsiblePhone: z.string().optional(),
          weeklyMenuId: z.number().nullable().optional(),
          openedAt: z.string().optional(),
          closedAt: z.string().nullable().optional(),
          orders: z.array(z.object({
            id: z.union([z.string(), z.number()]),
            paymentMethod: z.enum(["pix", "card", "cash"]),
            total: z.number().optional(),
            status: z.enum(["pending", "completed", "cancelled"]).optional(),
            customerId: z.number().optional(),
            customerName: z.string().optional(),
            createdAt: z.string().optional(),
            items: z.array(z.object({
              id: z.union([z.string(), z.number()]).optional(),
              productId: z.number().optional(),
              productName: z.string(),
              quantity: z.number(),
              price: z.number().optional(),
              unitPrice: z.number().optional(),
              subtotal: z.number().optional(),
            })),
          })),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const username = ctx.user.name || ctx.user.email || `admin-${ctx.user.id}`;
        const result = await db.syncLegacySessions(input.sessions, {
          userId: ctx.user.id,
          username,
        });
        publishRealtimeEvent({ entity: "historical-session", action: "linked" });
        return result;
      }),
  }),

  // Responsáveis pelo caixa — dados compartilhados entre usuários
  cashierResponsibles: router({
    list: publicProcedure.query(async () => db.getAllCashierResponsibles()),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), cpf: z.string().optional(), phone: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createCashierResponsible({
          userId: ctx.user.id,
          name: input.name.trim(),
          cpf: input.cpf?.trim() || null,
          phone: input.phone?.trim() || null,
        });
        publishRealtimeEvent({ entity: "responsible", action: "created", ids: result?.id ? { responsibleId: result.id } : undefined });
        return result;
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).optional(), cpf: z.string().nullable().optional(), phone: z.string().nullable().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const result = await db.updateCashierResponsible(id, data);
        publishRealtimeEvent({ entity: "responsible", action: "updated", ids: { responsibleId: id } });
        return result;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const result = await db.deleteCashierResponsible(input.id);
        publishRealtimeEvent({ entity: "responsible", action: "deleted", ids: { responsibleId: input.id } });
        return result;
      }),
  }),

  // Caixa
  cashier: router({
    openSession: protectedProcedure
      .input(
        z.object({
          responsibleId: z.number(),
          weeklyMenuId: z.number().optional(),
          initialBalance: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.createCashierSession({
          responsibleId: input.responsibleId,
          weeklyMenuId: input.weeklyMenuId,
          initialBalance: input.initialBalance,
          status: "open",
        });
        publishRealtimeEvent({ entity: "session", action: "opened", ids: { sessionId: result.id, ...(input.weeklyMenuId ? { menuId: input.weeklyMenuId } : {}) } });
        return result;
      }),

    getOpenSession: publicProcedure
      .input(z.object({ responsibleId: z.number(), weeklyMenuId: z.number().optional() }))
      .query(async ({ input }) => db.getOpenCashierSession(input.responsibleId, input.weeklyMenuId)),

    getAllSessionsWithOrders: protectedProcedure.query(async () => db.getAllCashierSessionsWithOrders()),

    getUnlinkedSessionsForReview: protectedProcedure.query(async () => db.getUnlinkedCashierSessionsForReview()),

    linkHistoricalSession: protectedProcedure
      .input(z.object({ sessionId: z.number().int().positive(), weeklyMenuId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        try {
          const result = await db.linkCashierSessionToMenu(input.sessionId, input.weeklyMenuId);
          publishRealtimeEvent({ entity: "historical-session", action: "linked", ids: { sessionId: input.sessionId, menuId: input.weeklyMenuId } });
          return result;
        } catch (error) {
          const code = error instanceof Error ? error.message : "UNKNOWN";
          if (code === "SESSION_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Sessão histórica não encontrada." });
          if (code === "SESSION_ALREADY_LINKED") throw new TRPCError({ code: "CONFLICT", message: "Esta sessão já está vinculada a um cardápio." });
          if (code === "MENU_NOT_FOUND") throw new TRPCError({ code: "NOT_FOUND", message: "Cardápio não encontrado." });
          throw error;
        }
      }),

    closeSession: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          finalBalance: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.closeCashierSession(input.sessionId, input.finalBalance);
        publishRealtimeEvent({ entity: "session", action: "closed", ids: { sessionId: input.sessionId } });
        return result;
      }),

    // Clientes
    getOrdersByCustomer: publicProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOrdersByCustomerId(input.customerId);
      }),
  }),

  customers: router({
    list: publicProcedure.query(async () => {
      return await db.getAllCustomers();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCustomerById(input.id);
      }),

    getDefault: publicProcedure.query(async () => {
      return await db.getDefaultCustomer();
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          phone: z.string().optional(),
          email: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.createCustomer({
          name: input.name,
          phone: input.phone || null,
          email: input.email || null,
          isActive: true,
        });
        publishRealtimeEvent({ entity: "customer", action: "created", ids: result?.id ? { customerId: result.id } : undefined });
        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const result = await db.updateCustomer(id, data);
        publishRealtimeEvent({ entity: "customer", action: "updated", ids: { customerId: id } });
        return result;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const result = await db.deleteCustomer(input.id);
        publishRealtimeEvent({ entity: "customer", action: "deleted", ids: { customerId: input.id } });
        return result;
      }),

    getOrdersWithCustomers: publicProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await db.getOrdersWithCustomersByDateRange(input.startDate, input.endDate);
      }),
  }),
});
