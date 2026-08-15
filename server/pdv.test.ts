import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSafeLegacyResponsibleId, getTestDataBlueprint } from "./db";
import { getExplicitCustomer, getFreshOrderDefaults, DEFAULT_PAYMENT_METHOD } from "../shared/posOrderFlow";
import { LOW_STOCK_THRESHOLD, getLowStockMessage, isLowGlobalStock } from "../shared/stockAlerts";
import { parseStockQuantity } from "../shared/stockQuantity";
import { canCreateSharedSale, selectPreferredOpenMenu } from "../shared/menuSelection";

describe("PDV System", () => {
  describe("Shared menu selection", () => {
    const menus = [
      { id: 10, status: "open" as const },
      { id: 20, status: "open" as const },
      { id: 30, status: "closed" as const },
    ];

    it("uses the saved default only when that menu is open", () => {
      expect(selectPreferredOpenMenu(menus, "20")?.id).toBe(20);
      expect(selectPreferredOpenMenu(menus, "30")).toBeNull();
    });

    it("requires explicit selection when multiple open menus exist without a valid default", () => {
      expect(selectPreferredOpenMenu(menus)).toBeNull();
      expect(canCreateSharedSale(null, 2)).toBe(false);
      expect(canCreateSharedSale(20, 2)).toBe(true);
    });

    it("selects the only open menu automatically", () => {
      expect(selectPreferredOpenMenu([{ id: 40, status: "open" as const }])?.id).toBe(40);
      expect(selectPreferredOpenMenu([{ id: 50, status: "closed" as const }])).toBeNull();
    });
  });

  describe("Cart Calculations", () => {
    it("should calculate total correctly with single item", () => {
      const item = { id: 1, name: "Hamburger", price: 25.0, quantity: 2 };
      const total = item.price * item.quantity;
      expect(total).toBe(50.0);
    });

    it("should calculate total correctly with multiple items", () => {
      const items = [
        { id: 1, name: "Hamburger", price: 25.0, quantity: 2 },
        { id: 2, name: "Pizza", price: 35.0, quantity: 1 },
      ];
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(total).toBe(85.0);
    });

    it("should handle decimal prices correctly", () => {
      const item = { id: 1, name: "Refrigerante", price: 8.50, quantity: 3 };
      const total = item.price * item.quantity;
      expect(total).toBeCloseTo(25.5);
    });
  });

  describe("Stock Management", () => {
    it("should decrease stock when product is sold", () => {
      let stock = 10;
      const quantitySold = 3;
      stock -= quantitySold;
      expect(stock).toBe(7);
    });

    it("should mark product as unavailable when stock reaches zero", () => {
      let stock = 1;
      let isAvailable = true;
      stock -= 1;
      isAvailable = stock > 0;
      expect(isAvailable).toBe(false);
    });

    it("should not allow negative stock", () => {
      let stock = 2;
      const quantitySold = 5;
      stock = Math.max(0, stock - quantitySold);
      expect(stock).toBe(0);
    });
  });

  describe("Payment Methods", () => {
    it("should accept PIX payment method", () => {
      const paymentMethod = "pix";
      expect(["pix", "card", "cash"]).toContain(paymentMethod);
    });

    it("should accept Card payment method", () => {
      const paymentMethod = "card";
      expect(["pix", "card", "cash"]).toContain(paymentMethod);
    });

    it("should accept Cash payment method", () => {
      const paymentMethod = "cash";
      expect(["pix", "card", "cash"]).toContain(paymentMethod);
    });
  });

  describe("Order Processing", () => {
    it("should create order with correct total amount", () => {
      const items = [
        { productId: 1, quantity: 2, unitPrice: 25.0 },
        { productId: 2, quantity: 1, unitPrice: 35.0 },
      ];
      const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      expect(totalAmount).toBe(85.0);
    });

    it("should validate order has items", () => {
      const items: any[] = [];
      const isValid = items.length > 0;
      expect(isValid).toBe(false);
    });

    it("should validate payment method is set", () => {
      const paymentMethod = "pix";
      const isValid = ["pix", "card", "cash"].includes(paymentMethod);
      expect(isValid).toBe(true);
    });
  });

  describe("Cashier Session", () => {
    it("should open cashier session with initial balance", () => {
      const initialBalance = 100.0;
      const sessionStatus = "open";
      expect(sessionStatus).toBe("open");
      expect(initialBalance).toBeGreaterThanOrEqual(0);
    });

    it("should close cashier session with final balance", () => {
      const finalBalance = 250.0;
      const sessionStatus = "closed";
      expect(sessionStatus).toBe("closed");
      expect(finalBalance).toBeGreaterThanOrEqual(0);
    });

    it("should calculate session balance correctly", () => {
      const initialBalance = 100.0;
      const sales = [50.0, 35.0, 25.0];
      const totalSales = sales.reduce((sum, sale) => sum + sale, 0);
      const finalBalance = initialBalance + totalSales;
      expect(finalBalance).toBe(210.0);
    });
  });

  describe("Sales Report", () => {
    it("should calculate total sales by payment method", () => {
      const orders = [
        { paymentMethod: "pix", amount: 50.0 },
        { paymentMethod: "card", amount: 35.0 },
        { paymentMethod: "cash", amount: 25.0 },
        { paymentMethod: "pix", amount: 40.0 },
      ];

      const pixTotal = orders
        .filter(o => o.paymentMethod === "pix")
        .reduce((sum, o) => sum + o.amount, 0);
      const cardTotal = orders
        .filter(o => o.paymentMethod === "card")
        .reduce((sum, o) => sum + o.amount, 0);
      const cashTotal = orders
        .filter(o => o.paymentMethod === "cash")
        .reduce((sum, o) => sum + o.amount, 0);

      expect(pixTotal).toBe(90.0);
      expect(cardTotal).toBe(35.0);
      expect(cashTotal).toBe(25.0);
    });

    it("should calculate total revenue", () => {
      const orders = [
        { amount: 50.0 },
        { amount: 35.0 },
        { amount: 25.0 },
      ];
      const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
      expect(totalRevenue).toBe(110.0);
    });

    it("should count number of orders", () => {
      const orders = [
        { id: 1, amount: 50.0 },
        { id: 2, amount: 35.0 },
        { id: 3, amount: 25.0 },
      ];
      expect(orders.length).toBe(3);
    });
  });

  describe("Saturday Menu", () => {
    it("should identify Saturday correctly", () => {
      const date = new Date("2026-06-13"); // Saturday
      const isSaturday = date.getDay() === 6;
      expect(isSaturday).toBe(true);
    });

    it("should calculate Saturday order correctly", () => {
      const date = new Date("2026-06-13"); // First Saturday of June
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const saturdaysInMonth = [];
      
      for (let d = firstDayOfMonth; d.getMonth() === date.getMonth(); d.setDate(d.getDate() + 1)) {
        if (d.getDay() === 6) {
          saturdaysInMonth.push(new Date(d));
        }
      }
      
      const saturdayOrder = saturdaysInMonth.findIndex(d => 
        d.getDate() === date.getDate()
      ) + 1;
      
      expect(saturdayOrder).toBeGreaterThan(0);
    });
  });
});


describe("Correção de pagamento e estorno", () => {
  it("deve aceitar somente formas de pagamento suportadas", () => {
    const supported = ["pix", "card", "cash"];
    expect(supported).toContain("pix");
    expect(supported).toContain("card");
    expect(supported).toContain("cash");
    expect(supported).not.toContain("boleto");
  });

  it("deve permitir estorno somente de pedidos completed", () => {
    const canCancel = (status: string) => status === "completed";
    expect(canCancel("completed")).toBe(true);
    expect(canCancel("cancelled")).toBe(false);
    expect(canCancel("pending")).toBe(false);
  });

  it("deve devolver quantidade positiva ao estoque durante o estorno", () => {
    const currentQuantity = 2;
    const soldQuantity = 3;
    const restoredQuantity = currentQuantity + Math.abs(soldQuantity);
    expect(restoredQuantity).toBe(5);
    expect(Math.abs(soldQuantity)).toBeGreaterThan(0);
  });

  it("deve excluir pedidos cancelados dos totais do relatório", () => {
    const orders = [
      { status: "completed", total: 50 },
      { status: "cancelled", total: 35 },
      { status: undefined, total: 15 },
    ];
    const activeOrders = orders.filter((order) => order.status !== "cancelled");
    expect(activeOrders).toHaveLength(2);
    expect(activeOrders.reduce((sum, order) => sum + order.total, 0)).toBe(65);
  });
});


describe("Fluxo de pedido com cliente", () => {
  const generalCustomer = { id: 1, name: "GERAL", isDefault: true };
  const selectedCustomer = { id: 7, name: "Maria Santos", isDefault: false };
  const finalizeOrder = (customer?: { id: number; name: string }) => {
    const explicitCustomer = getExplicitCustomer(customer);
    if (!explicitCustomer) return null;
    return {
      id: 1001,
      status: "completed",
      customerId: explicitCustomer.id,
      customerName: explicitCustomer.name,
      total: 25,
      items: [{ productName: "Hambúrguer", quantity: 1, subtotal: 25 }],
    };
  };

  it("deve bloquear a finalização quando nenhum cliente é selecionado", () => {
    expect(finalizeOrder()).toBeNull();
  });

  it("deve persistir o cliente selecionado no pedido", () => {
    const order = finalizeOrder(selectedCustomer);
    const persisted = JSON.parse(JSON.stringify({ cashierSessions: [{ orders: [order] }] }));
    const savedOrder = persisted.cashierSessions[0].orders[0];

    expect(savedOrder.customerId).toBe(7);
    expect(savedOrder.customerName).toBe("Maria Santos");
  });

  it("deve disponibilizar o nome do cliente para cupom e relatório", () => {
    const order = finalizeOrder(selectedCustomer);
    expect(order).not.toBeNull();
    const receiptLine = `Cliente: ${order!.customerName}`;
    const reportCustomer = order!.customerName;

    expect(receiptLine).toBe("Cliente: Maria Santos");
    expect(reportCustomer).toBe("Maria Santos");
  });
});

describe("Reset do novo pedido no POS", () => {
  it("deve voltar ao estado vazio com PIX como pagamento padrão", () => {
    const defaults = getFreshOrderDefaults();
    expect(defaults.customer).toBeNull();
    expect(defaults.paymentMethod).toBe(DEFAULT_PAYMENT_METHOD);
    expect(defaults.amountReceived).toBe(0);
    expect(defaults.showConfirm).toBe(false);
    expect(defaults.cart).toHaveLength(0);
  });
});

describe("Edição rápida de estoque", () => {
  it("aceita apenas quantidades inteiras não negativas", () => {
    expect(parseStockQuantity("10")).toBe(10);
    expect(parseStockQuantity("0")).toBe(0);
    expect(parseStockQuantity("2.5")).toBeNull();
    expect(parseStockQuantity("-1")).toBeNull();
    expect(parseStockQuantity("")).toBeNull();
  });
});

describe("Alertas de estoque baixo", () => {
  it("deve alertar somente quando o estoque global for menor que 3", () => {
    expect(LOW_STOCK_THRESHOLD).toBe(3);
    expect(isLowGlobalStock({ name: "Hambúrguer", quantity: 2 })).toBe(true);
    expect(isLowGlobalStock({ name: "Hambúrguer", quantity: 3 })).toBe(false);
    expect(isLowGlobalStock({ name: "Hambúrguer", quantity: 0 })).toBe(true);
  });

  it("deve considerar o desconto da venda ao avaliar o estoque restante", () => {
    const product = { name: "Coxinha", quantity: 5, isUnlimited: false };
    const quantityAfterSale = product.quantity - 3;
    expect(isLowGlobalStock(product, quantityAfterSale)).toBe(true);
    expect(getLowStockMessage(product.name)).toBe("ALERTA: Coxinha tem quantidade no estoque menor que 3");
  });
});

describe("Estorno Parcial por Item", () => {
  it("deve validar saldo e impedir estorno acima da quantidade restante", () => {
    const item = { id: 1, quantity: 5, refundedQuantity: 2 };
    const remaining = item.quantity - item.refundedQuantity;
    expect(remaining).toBe(3);
    const requestedValid = 2;
    const requestedInvalid = 4;
    expect(requestedValid <= remaining).toBe(true);
    expect(requestedInvalid <= remaining).toBe(false);
  });

  it("deve somar corretamente a quantidade estornada de volta ao estoque global e disponível do produto", () => {
    const initialStock = 10;
    const soldQuantity = 3;
    const stockAfterSale = initialStock - soldQuantity;
    expect(stockAfterSale).toBe(7);

    const refundedQuantity = 3;
    const stockAfterRefund = stockAfterSale + refundedQuantity;
    expect(stockAfterRefund).toBe(10);
  });

  it("gera payload de estorno sem valores NaN para pedidos com múltiplos produtos", () => {
    const items = [
      { id: undefined, orderItemId: undefined, productName: "Tapioca", quantity: 2, refundedQuantity: 0 },
      { id: undefined, orderItemId: undefined, productName: "Suco", quantity: 3, refundedQuantity: 0 },
    ];
    const refundQuantities = { "1": 1 }; // estornando apenas o primeiro item (fallback index + 1)

    const itemsPayload = items.map((item: any, index: number) => {
      const officialId = Number(item.id ?? item.orderItemId);
      const validId = Number.isInteger(officialId) && officialId > 0 ? officialId : (index + 1);
      const itemKey = String(validId);
      const qty = refundQuantities[itemKey] ?? refundQuantities[String(index + 1)] ?? 0;
      return { orderItemId: validId, quantity: Number(qty) };
    }).filter((i) => i.quantity > 0 && Number.isInteger(i.orderItemId) && i.orderItemId > 0);

    expect(itemsPayload).toHaveLength(1);
    expect(itemsPayload[0].orderItemId).toBe(1);
    expect(itemsPayload[0].quantity).toBe(1);
    expect(Number.isNaN(itemsPayload[0].orderItemId)).toBe(false);
  });
});

describe("Gerador de dados de teste", () => {
  it("deve oferecer um conjunto determinístico de produtos e pedidos válidos", () => {
    const blueprint = getTestDataBlueprint();
    expect(blueprint.products).toHaveLength(6);
    expect(blueprint.customers).toHaveLength(3);
    expect(blueprint.orders).toHaveLength(5);
    expect(blueprint.products.every((product) => product.name.startsWith("Teste -"))).toBe(true);
    expect(blueprint.orders.every((order) => ["pix", "card", "cash"].includes(order.paymentMethod))).toBe(true);
  });

  it("deve calcular o total e a quantidade de itens do lote de teste", () => {
    const blueprint = getTestDataBlueprint();
    const total = blueprint.orders.reduce((sum, order) => sum + order.items.reduce((orderSum, item) => {
      return orderSum + blueprint.products[item.productIndex].price * item.quantity;
    }, 0), 0);
    const itemCount = blueprint.orders.reduce((sum, order) => sum + order.items.reduce((orderSum, item) => orderSum + item.quantity, 0), 0);

    expect(total).toBeCloseTo(215.6, 2);
    expect(itemCount).toBe(14);
  });
});

describe("Resolução de responsáveis na integração legada", () => {
  it("deve rejeitar timestamps locais como IDs oficiais de responsável", () => {
    expect(getSafeLegacyResponsibleId(1783799792072)).toBeNull();
    expect(getSafeLegacyResponsibleId("1783799792072")).toBeNull();
    expect(getSafeLegacyResponsibleId(12)).toBe(12);
    expect(getSafeLegacyResponsibleId("12")).toBe(12);
  });

  it("deve rejeitar valores fracionários, negativos e vazios", () => {
    expect(getSafeLegacyResponsibleId(1.5)).toBeNull();
    expect(getSafeLegacyResponsibleId(-1)).toBeNull();
    expect(getSafeLegacyResponsibleId("")) .toBeNull();
    expect(getSafeLegacyResponsibleId(undefined)).toBeNull();
  });
});

describe("Migração de pedidos legados e auditoria", () => {
  const buildLegacyKey = (sessionId: string | number, orderId: string | number) =>
    `local:${String(sessionId)}:${String(orderId)}`;

  it("deve produzir a mesma chave para a mesma sessão e pedido", () => {
    expect(buildLegacyKey("sessao-1", "pedido-9")).toBe("local:sessao-1:pedido-9");
    expect(buildLegacyKey("sessao-1", "pedido-9")).toBe(buildLegacyKey("sessao-1", "pedido-9"));
  });

  it("deve manter pedidos de sessões diferentes distintos mesmo com o mesmo ID local", () => {
    expect(buildLegacyKey(1, 42)).not.toBe(buildLegacyKey(2, 42));
  });

  it("deve preservar os campos essenciais da auditoria de estorno", () => {
    const audit = {
      orderId: 42,
      username: "admin",
      loginMethod: "local",
      reason: "Cliente solicitou cancelamento",
      itemsSnapshot: [{ productId: 7, productName: "Hambúrguer", quantity: 2 }],
    };

    expect(audit).toMatchObject({
      orderId: 42,
      username: "admin",
      loginMethod: "local",
      reason: "Cliente solicitou cancelamento",
    });
    expect(audit.itemsSnapshot).toHaveLength(1);
  });
});


describe("Modelo compartilhado de sessões e relatórios", () => {
  it("deve manter uma sessão vinculada ao cardápio correto", () => {
    const sessions = [
      { id: 1, weeklyMenuId: 10, orders: [{ id: 101 }] },
      { id: 2, weeklyMenuId: 20, orders: [{ id: 202 }] },
    ];

    const menu10Sessions = sessions.filter((session) => session.weeklyMenuId === 10);
    expect(menu10Sessions).toHaveLength(1);
    expect(menu10Sessions[0].orders[0].id).toBe(101);
  });

  it("deve calcular o saldo visual do cardápio sem persistir alterações antes da venda", () => {
    const availableQuantity = 5;
    const cartQuantity = 2;
    const remainingQuantity = Math.max(0, availableQuantity - cartQuantity);

    expect(remainingQuantity).toBe(3);
    expect(availableQuantity).toBe(5);
  });

  it("deve ignorar pedidos cancelados no relatório compartilhado", () => {
    const orders = [
      { status: "completed", total: 30 },
      { status: "cancelled", total: 20 },
      { status: "completed", total: 15 },
    ];
    const activeOrders = orders.filter((order) => order.status !== "cancelled");

    expect(activeOrders.map((order) => order.total)).toEqual([30, 15]);
    expect(activeOrders.reduce((sum, order) => sum + order.total, 0)).toBe(45);
  });
});


describe("Visibilidade entre usuários", () => {
  it("deve fazer dois leitores observarem a mesma alteração na fonte compartilhada", () => {
    const sharedState = { menus: [{ id: 1, status: "open" as const, version: 1 }] };
    const readMenus = () => sharedState.menus.map((menu) => ({ ...menu }));

    const alexandreView = readMenus();
    sharedState.menus[0] = { id: 1, status: "closed", version: 2 };
    const testeView = readMenus();

    expect(alexandreView[0].status).toBe("open");
    expect(testeView[0]).toEqual({ id: 1, status: "closed", version: 2 });
    expect(readMenus()[0]).toEqual(testeView[0]);
  });
});
