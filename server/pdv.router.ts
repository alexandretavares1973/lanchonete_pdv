import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

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
          quantity: z.number().nullable(),
          isUnlimited: z.boolean().default(false),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createProduct({
          name: input.name,
          price: input.price,
          quantity: input.quantity,
          isUnlimited: input.isUnlimited,
          description: input.description,
          isAvailable: true,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          price: z.number().optional(),
          quantity: z.number().nullable().optional(),
          isUnlimited: z.boolean().optional(),
          isAvailable: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateProduct(id, data);
      }),
  }),

  // Cardápio Semanal
  menu: router({
    getByDate: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return await db.getWeeklyMenuByDate(input.date);
      }),

    create: protectedProcedure
      .input(
        z.object({
          saturdayDate: z.string(),
          saturdayOrder: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createWeeklyMenu(input);
      }),

    addItem: protectedProcedure
      .input(
        z.object({
          menuId: z.number(),
          productId: z.number(),
          availableQuantity: z.number().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createMenuItem(input);
      }),

    updateItemAvailability: protectedProcedure
      .input(
        z.object({
          menuItemId: z.number(),
          isAvailable: z.boolean(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.updateMenuItem(input.menuItemId, {
          isAvailable: input.isAvailable,
        });
      }),

    getItems: publicProcedure
      .input(z.object({ menuId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMenuItemsByMenuId(input.menuId);
      }),
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
        })
      )
      .mutation(async ({ input }) => {
        const totalAmount = input.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );

        const orderResult = await db.createOrder({
          cashierSessionId: input.cashierSessionId,
          totalAmount,
          paymentMethod: input.paymentMethod,
          status: "completed",
        });

        // O resultado agora é o objeto do pedido criado
        const orderId = (orderResult as any)?.id;
        
        if (!orderId) {
          throw new Error("Failed to get order ID after creation");
        }
        
        for (const item of input.items) {
          await db.createOrderItem({
            orderId: orderId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
          });

          // Registrar no histórico de estoque
          await db.createStockHistory({
            productId: item.productId,
            orderId: orderId,
            quantityChange: -item.quantity,
            reason: "Venda",
          });

          // Atualizar quantidade do produto
          const product = await db.getProductById(item.productId);
          if (product && !product.isUnlimited && product.quantity) {
            const newQuantity = Math.max(0, product.quantity - item.quantity);
            await db.updateProduct(item.productId, {
              quantity: newQuantity,
              isAvailable: newQuantity > 0,
            });
          }
        }

        return orderResult;
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
        return await db.updateOrderPaymentMethod(input.orderId, input.paymentMethod);
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
        return await db.syncLegacySessions(input.sessions, {
          userId: ctx.user.id,
          username,
        });
      }),
  }),

  // Caixa
  cashier: router({
    openSession: protectedProcedure
      .input(
        z.object({
          responsibleId: z.number(),
          initialBalance: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createCashierSession({
          responsibleId: input.responsibleId,
          initialBalance: input.initialBalance,
          status: "open",
        });
      }),

    getOpenSession: publicProcedure
      .input(z.object({ responsibleId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOpenCashierSession(input.responsibleId);
      }),

    closeSession: protectedProcedure
      .input(
        z.object({
          sessionId: z.number(),
          finalBalance: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.closeCashierSession(input.sessionId, input.finalBalance);
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
        return await db.createCustomer({
          name: input.name,
          phone: input.phone || null,
          email: input.email || null,
          isActive: true,
        });
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
        return await db.updateCustomer(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCustomer(input.id);
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
