import { z } from "zod";
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
  }),
});
