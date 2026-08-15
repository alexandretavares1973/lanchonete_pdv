import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Printer, RotateCcw } from "lucide-react";

interface MenuItem {
  id: string;
  productId?: number;
  productName: string;
  price: number;
  quantity: number | null;
  isUnlimited: boolean;
  isAvailable?: boolean;
}

interface WeeklyMenu {
  id: number;
  saturdayDate: string;
  saturdayOrder: number;
  responsibleId: number | null;
  responsibleName?: string;
  items: MenuItem[];
}

interface OrderItem {
  id?: string;
  productId?: number;
  productName: string;
  quantity: number;
  refundedQuantity?: number;
  price?: number;
  unitPrice?: number;
  subtotal: number;
}

interface Order {
  id: number;
  legacyId?: string | number;
  paymentMethod: "pix" | "card" | "cash";
  total: number;
  status?: "pending" | "completed" | "cancelled";
  items: OrderItem[];
  createdAt: string;
}

interface CashierSession {
  id: number;
  legacyId?: string | number;
  responsibleId?: number | null;
  weeklyMenuId: number;
  openedAt: string;
  closedAt: string | null;
  orders: Order[];
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  createdAt: Date;
}

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [sessions, setSessions] = useState<CashierSession[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedSession, setSelectedSession] = useState<CashierSession | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [pendingPaymentChange, setPendingPaymentChange] = useState<{
    orderId: number;
    previousPaymentMethod: Order["paymentMethod"];
    paymentMethod: Order["paymentMethod"];
  } | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [refundQuantities, setRefundQuantities] = useState<Record<string, number>>({});
  const orderItemsQuery = trpc.pdv.orders.getItems.useQuery(
    { orderId: orderToCancel?.id ?? 0 },
    { enabled: Boolean(orderToCancel?.id && orderToCancel.id > 0) }
  );
  const refundItemsMutation = trpc.pdv.orders.refundItems.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.pdv.orders.getBySession.invalidate(),
        utils.pdv.products.list.invalidate(),
        utils.pdv.menu.getItems.invalidate(),
      ]);
      toast.success("✅ Estorno parcial realizado com sucesso! Estoque devolvido.");
      setOrderToCancel(null);
      setCancelReason("");
      setRefundQuantities({});
    },
    onError: (err) => {
      if (orderToCancel && isOrderMissingInBackend(err)) {
        // Se o pedido for estritamente local (não sincronizado com o banco), aplicamos o estorno localmente
        restoreLocalMenuStock(orderToCancel);
        updateOrderInLocalStorage(orderToCancel.id, { status: "cancelled" });
        toast.success("Estorno aplicado no registro local do relatório e estoque restaurado.");
        setOrderToCancel(null);
        setCancelReason("");
        setRefundQuantities({});
        return;
      }
      toast.error(`❌ Erro ao estornar itens: ${err.message}`);
    },
  });
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const legacySyncAttempted = useRef(false);
  const utils = trpc.useUtils();
  const updatePaymentMethodMutation = trpc.pdv.orders.updatePaymentMethod.useMutation();
  const cancelOrderMutation = trpc.pdv.orders.cancel.useMutation();
  const syncLegacyMutation = trpc.pdv.orders.syncLegacy.useMutation();
  const refundAuditsQuery = trpc.pdv.orders.getRefundAudits.useQuery(
    { orderIds: selectedOrderIds },
    { enabled: showDetails && selectedOrderIds.length > 0 },
  );

  const persistSessions = (nextSessions: CashierSession[]) => {
    setSessions(nextSessions);
    localStorage.setItem("cashierSessions", JSON.stringify(nextSessions));
    if (selectedSession) {
      const refreshed = nextSessions.find((session) => session.id === selectedSession.id);
      if (refreshed) setSelectedSession(refreshed);
    }
  };

  const updateOrderInLocalStorage = (orderId: number, patch: Partial<Order>) => {
    const nextSessions = sessions.map((session) => ({
      ...session,
      orders: (session.orders || []).map((order) => order.id === orderId ? { ...order, ...patch } : order),
    }));
    persistSessions(nextSessions);
  };

  const restoreLocalMenuStock = (order: Order) => {
    const session = sessions.find((candidate) => (candidate.orders || []).some((candidateOrder) => candidateOrder.id === order.id));
    if (!session) return;
    const productIds = new Map<string, number>();
    order.items.forEach((item) => {
      const productId = item.productId ?? item.id;
      if (productId !== undefined) productIds.set(String(productId), (productIds.get(String(productId)) || 0) + item.quantity);
    });
    const nextMenus = menus.map((menu) => menu.id !== session.weeklyMenuId ? menu : ({
      ...menu,
      items: menu.items.map((item) => {
        const key = String(item.productId ?? item.id);
        const restored = productIds.get(key) || productIds.get(String(item.id));
        if (!restored || item.quantity === null) return item;
        const quantity = item.quantity + restored;
        return { ...item, quantity, isAvailable: quantity > 0 };
      }),
    }));
    setMenus(nextMenus);
    localStorage.setItem("weeklyMenus", JSON.stringify(nextMenus));
  };

  const isOrderMissingInBackend = (error: any) => error?.data?.code === "NOT_FOUND" || /pedido não encontrado/i.test(error?.message || "");

  const handleRequestPaymentChange = (order: Order, paymentMethod: Order["paymentMethod"]) => {
    if (order.status === "cancelled" || order.paymentMethod === paymentMethod) return;
    setPendingPaymentChange({
      orderId: order.id,
      previousPaymentMethod: order.paymentMethod,
      paymentMethod,
    });
  };

  const handleConfirmPaymentChange = async () => {
    if (!pendingPaymentChange) return;
    try {
      await updatePaymentMethodMutation.mutateAsync({
        orderId: pendingPaymentChange.orderId,
        paymentMethod: pendingPaymentChange.paymentMethod,
      });
      updateOrderInLocalStorage(pendingPaymentChange.orderId, {
        paymentMethod: pendingPaymentChange.paymentMethod,
      });
      await utils.pdv.orders.getBySession.invalidate();
      await utils.pdv.orders.getItems.invalidate({ orderId: pendingPaymentChange.orderId });
      toast.success("Forma de pagamento corrigida com sucesso.");
      setPendingPaymentChange(null);
    } catch (error: any) {
      if (isOrderMissingInBackend(error)) {
        // Pedidos criados no fluxo legado ficam apenas no localStorage; ainda assim
        // permitimos a correção local sem mascarar erros de autenticação ou banco.
        updateOrderInLocalStorage(pendingPaymentChange.orderId, {
          paymentMethod: pendingPaymentChange.paymentMethod,
        });
        toast.success("Forma de pagamento corrigida no registro local do relatório.");
        setPendingPaymentChange(null);
        return;
      }
      toast.error(error?.message || "Não foi possível corrigir a forma de pagamento.");
    }
  };

  const handleConfirmCancellation = async () => {
    if (!orderToCancel) return;
    try {
      await cancelOrderMutation.mutateAsync({
        orderId: orderToCancel.id,
        reason: cancelReason.trim() || undefined,
      });
      updateOrderInLocalStorage(orderToCancel.id, { status: "cancelled" });
      await Promise.all([
        utils.pdv.orders.getBySession.invalidate(),
        utils.pdv.orders.getItems.invalidate({ orderId: orderToCancel.id }),
        utils.pdv.products.list.invalidate(),
        utils.pdv.menu.getItems.invalidate(),
      ]);
      toast.success("Venda estornada. O estoque foi devolvido e os totais foram atualizados.");
      setOrderToCancel(null);
      setCancelReason("");
    } catch (error: any) {
      if (isOrderMissingInBackend(error)) {
        restoreLocalMenuStock(orderToCancel);
        updateOrderInLocalStorage(orderToCancel.id, { status: "cancelled" });
        toast.success("Venda estornada no registro local do relatório e estoque do cardápio restaurado.");
        setOrderToCancel(null);
        setCancelReason("");
        return;
      }
      toast.error(error?.message || "Não foi possível estornar a venda.");
    }
  };

  useEffect(() => {
    const storedMenus = localStorage.getItem("weeklyMenus");
    if (storedMenus) {
      setMenus(JSON.parse(storedMenus));
    }

    const storedSessions = localStorage.getItem("cashierSessions");
    if (storedSessions) {
      setSessions(JSON.parse(storedSessions));
    const storedCustomers = localStorage.getItem("customers");
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    }
    }
  }, []);

  const synchronizeLegacyOrders = async (manual = false) => {
    if (sessions.length === 0 || syncLegacyMutation.isPending) return;
    if (!manual && legacySyncAttempted.current) return;
    legacySyncAttempted.current = true;

    const normalizePaymentMethod = (value: unknown): Order["paymentMethod"] =>
      value === "pix" || value === "card" || value === "cash" ? value : "cash";

    const payload = sessions.map((session) => ({
      id: session.legacyId ?? session.id,
      // Não enviamos o responsibleId numérico porque ele pode ser um ID local (Date.now()) inválido para o banco.
      // O backend resolverá o responsável pelo nome ou pelo usuário autenticado.
      responsibleName: menus.find((menu) => menu.id === session.weeklyMenuId)?.responsibleName,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      orders: (session.orders || []).map((order) => {
        const legacyOrder = order as Order & { customerName?: string; customer?: { name?: string } };
        return {
          id: order.legacyId ?? order.id,
          paymentMethod: normalizePaymentMethod(order.paymentMethod),
          total: Number(order.total || 0),
          status: order.status || "completed",
          customerName: legacyOrder.customerName || legacyOrder.customer?.name,
          createdAt: order.createdAt,
          items: (order.items || []).map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            quantity: Number(item.quantity || 0),
            price: Number(item.price ?? item.unitPrice ?? 0),
            unitPrice: Number(item.unitPrice ?? item.price ?? 0),
            subtotal: Number(item.subtotal || 0),
          })),
        };
      }),
    }));

    try {
      const result = await syncLegacyMutation.mutateAsync({ sessions: payload });
      if (result.ordersCreated === 0 && result.ordersSkipped === 0) {
        if (manual) toast.info("Nenhum pedido legado pendente foi encontrado.");
        return;
      }
      const orderMapping = new Map(result.orderMappings.map((entry) => [entry.legacyKey, entry.officialId]));
      const sessionMapping = new Map(result.sessionMappings.map((entry) => [String(entry.legacySessionId), entry.officialId]));
      const nextSessions = sessions.map((session) => {
        const legacySessionId = session.legacyId ?? session.id;
        return {
          ...session,
          legacyId: session.legacyId ?? session.id,
          id: sessionMapping.get(String(legacySessionId)) ?? session.id,
          orders: (session.orders || []).map((order) => {
            const legacyKey = `local:${String(legacySessionId)}:${String(order.legacyId ?? order.id)}`;
            const officialId = orderMapping.get(legacyKey);
            return officialId ? { ...order, legacyId: order.legacyId ?? order.id, id: officialId } : order;
          }),
        };
      });
      persistSessions(nextSessions);
      toast.success(`${result.ordersCreated} novo(s) pedido(s) legado(s) integrado(s); ${result.ordersSkipped} já existente(s).`);
    } catch (error: any) {
      legacySyncAttempted.current = false;
      if (manual) toast.error(error?.message || "Não foi possível integrar os pedidos legados.");
      console.error("Falha ao sincronizar pedidos legados", error);
    }
  };

  useEffect(() => {
    void synchronizeLegacyOrders();
  }, [sessions.length]);

  const getSaturdayLabel = (order: number) => {
    const labels = ["1º", "2º", "3º", "4º", "5º"];
    return `${labels[order - 1] || order}º Sábado`;
  };

  const getSessionsForMenu = (menuId: number) => {
    return sessions.filter(s => s.weeklyMenuId === menuId);
  };

  const calculateReportData = (session: CashierSession) => {
    const menu = menus.find(m => m.id === session.weeklyMenuId);
    const orders = (session.orders || []).filter((order) => order.status !== "cancelled");

    // Agrupar vendas por produto
    const productSales: Record<string, { name: string; quantity: number; unitPrice: number; subtotal: number }> = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.productName;
        const unitPrice = item.unitPrice || item.price || 0;
        const netQuantity = item.quantity - (item.refundedQuantity || 0);
        if (netQuantity <= 0) return;
        
        if (!productSales[key]) {
          productSales[key] = {
            name: item.productName,
            quantity: 0,
            unitPrice: unitPrice,
            subtotal: 0,
          };
        }
        productSales[key].quantity += netQuantity;
        productSales[key].subtotal += netQuantity * unitPrice;
      });
    });

    // Totais por forma de pagamento considerando o valor líquido estornável
    const paymentTotals = {
      pix: 0,
      card: 0,
      cash: 0,
    };

    orders.forEach(order => {
      const orderNetTotal = order.items.reduce((sum, item) => {
        const netQty = item.quantity - (item.refundedQuantity || 0);
        const uPrice = item.unitPrice || item.price || 0;
        return sum + (netQty * uPrice);
      }, 0);
      paymentTotals[order.paymentMethod] += orderNetTotal;
    });

    const grandTotal = orders.reduce((sum, order) => {
      const orderNetTotal = order.items.reduce((itemSum, item) => {
        const netQty = item.quantity - (item.refundedQuantity || 0);
        const uPrice = item.unitPrice || item.price || 0;
        return itemSum + (netQty * uPrice);
      }, 0);
      return sum + orderNetTotal;
    }, 0);

    return {
      menu,
      productSales,
      paymentTotals,
      grandTotal,
      totalItems: orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity - (item.refundedQuantity || 0)), 0), 0),
      ordersCount: orders.length,
    };
  };

  const handleViewSession = (session: CashierSession) => {
    setSelectedSession(session);
    setSelectedOrderIds((session.orders || []).map((order) => Number(order.id)).filter((id) => Number.isInteger(id) && id > 0));
    setShowDetails(true);
  };

  const handlePrint = (session: CashierSession) => {
    const report = calculateReportData(session);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const productRows = Object.entries(report.productSales)
      .map(([_, product]) => {
        return `
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #999;">
            <div style="flex: 1;">
              <div style="font-weight: bold;">${product.name}</div>
              <div style="font-size: 11px; color: #666;">Qtd: ${product.quantity} x R$ ${product.unitPrice.toFixed(2)}</div>
            </div>
            <div style="text-align: right; font-weight: bold; min-width: 80px;">R$ ${product.subtotal.toFixed(2)}</div>
          </div>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Vendas</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            background: white; 
            color: #000;
            padding: 10px;
          }
          .container { 
            width: 80mm; 
            margin: 0 auto; 
            padding: 10px;
            background: white;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
            margin-bottom: 15px; 
          }
          .header h1 { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 5px; 
          }
          .header p { 
            font-size: 11px; 
            margin: 3px 0; 
          }
          .divider { 
            border-bottom: 2px solid #000; 
            margin: 10px 0; 
          }
          .section-title { 
            font-weight: bold; 
            font-size: 12px; 
            margin-top: 12px; 
            margin-bottom: 8px; 
            padding-bottom: 5px;
            border-bottom: 1px solid #000;
          }
          .product-item { 
            display: flex; 
            justify-content: space-between; 
            font-size: 12px; 
            margin: 8px 0; 
            padding: 5px 0; 
            border-bottom: 1px dotted #999; 
          }
          .product-name { 
            flex: 1; 
            font-weight: bold;
          }
          .product-qty { 
            font-size: 11px; 
            color: #666;
            margin-top: 2px;
          }
          .product-total { 
            text-align: right; 
            font-weight: bold; 
            min-width: 80px; 
          }
          .summary { 
            font-size: 11px; 
            margin: 10px 0; 
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0; 
          }
          .payment-section { 
            margin-top: 12px; 
          }
          .payment-row { 
            display: flex; 
            justify-content: space-between; 
            font-size: 11px; 
            margin: 5px 0; 
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            font-size: 13px; 
            font-weight: bold; 
            margin: 10px 0; 
            padding: 8px 0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
          }
          .footer { 
            text-align: center; 
            font-size: 10px; 
            margin-top: 15px; 
            padding-top: 10px; 
          }
          @media print { 
            body { margin: 0; padding: 0; } 
            .container { width: 80mm; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LANCHONETE PDV</h1>
            <p>RELATÓRIO DE VENDAS</p>
            <p>━━━━━━━━━━━━━━━━━━━━━━━</p>
            <p><strong>Cardápio:</strong> ${report.menu ? getSaturdayLabel(report.menu.saturdayOrder) : "N/A"}</p>
            <p><strong>Data:</strong> ${report.menu ? new Date(report.menu.saturdayDate).toLocaleDateString("pt-BR") : "N/A"}</p>
            <p><strong>Responsável:</strong> ${report.menu?.responsibleName || "N/A"}</p>
            <p><strong>Abertura:</strong> ${new Date(session.openedAt).toLocaleTimeString("pt-BR")}</p>
          </div>

          <div class="section-title">PRODUTOS VENDIDOS</div>
          <div>
            ${productRows}
          </div>

          <div class="divider"></div>

          <div class="summary">
            <div class="summary-row">
              <span><strong>Total de Itens:</strong></span>
              <span>${report.totalItems}</span>
            </div>
            <div class="summary-row">
              <span><strong>Total de Pedidos:</strong></span>
              <span>${report.ordersCount}</span>
            </div>
          </div>

          <div class="section-title">RESUMO DE PAGAMENTOS</div>
          <div class="payment-section">
            <div class="payment-row">
              <span>📱 PIX:</span>
              <span><strong>R$ ${report.paymentTotals.pix.toFixed(2)}</strong></span>
            </div>
            <div class="payment-row">
              <span>💳 Cartão:</span>
              <span><strong>R$ ${report.paymentTotals.card.toFixed(2)}</strong></span>
            </div>
            <div class="payment-row">
              <span>💵 Dinheiro:</span>
              <span><strong>R$ ${report.paymentTotals.cash.toFixed(2)}</strong></span>
            </div>
          </div>

          <div class="divider"></div>
          <div class="total-row">
            <span>TOTAL GERAL:</span>
            <span>R$ ${report.grandTotal.toFixed(2)}</span>
          </div>

          <div class="footer">
            <p>Relatório gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
            <p>às ${new Date().toLocaleTimeString("pt-BR")}</p>
            <p style="margin-top: 10px;">✓ Obrigado!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const activeSessions = selectedMenuId
    ? getSessionsForMenu(selectedMenuId)
    : sessions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios de Vendas</h1>
            <p className="text-muted-foreground">Vendas por cardápio semanal</p>
          </div>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        {/* Menu Filter */}
          <Card className="p-6 mb-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Filtrar por Cardápio</h2>
              <p className="text-xs text-muted-foreground">Pedidos locais são integrados ao banco de forma idempotente.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void synchronizeLegacyOrders(true)}
              disabled={syncLegacyMutation.isPending || sessions.length === 0}
              className="gap-2"
            >
              {syncLegacyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Integrar pedidos locais
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <Button
              onClick={() => setSelectedMenuId(null)}
              variant={selectedMenuId === null ? "default" : "outline"}
              className={selectedMenuId === null ? "bg-gradient-to-r from-primary to-secondary" : ""}
            >
              Todos
            </Button>
            {menus.map(menu => (
              <Button
                key={menu.id}
                onClick={() => setSelectedMenuId(menu.id)}
                variant={selectedMenuId === menu.id ? "default" : "outline"}
                className={selectedMenuId === menu.id ? "bg-gradient-to-r from-primary to-secondary" : ""}
              >
                {getSaturdayLabel(menu.saturdayOrder)}
              </Button>
            ))}
          </div>
        </Card>

        {/* Sessions List */}
        <div className="space-y-4">
          {activeSessions.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Nenhuma venda registrada</p>
            </Card>
          ) : (
            activeSessions.map(session => {
              const report = calculateReportData(session);
              return (
                <Card key={session.id} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Cardápio</p>
                      <p className="font-semibold text-foreground">
                        {report.menu ? getSaturdayLabel(report.menu.saturdayOrder) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-semibold text-foreground">
                        {new Date(session.openedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Vendas</p>
                      <p className="font-semibold text-primary text-lg">
                        R$ {report.grandTotal.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quantidade de Itens</p>
                      <p className="font-semibold text-foreground">{report.totalItems}</p>
                    </div>
                  </div>

                  {/* Products Details */}
                  <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <h4 className="font-semibold text-foreground mb-3">Detalhes dos Produtos</h4>
                    <div className="space-y-2">
                      {Object.entries(report.productSales).map(([key, product]) => (
                        <div key={key} className="flex justify-between items-center p-2 bg-background rounded border border-border/50">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Qtd: {product.quantity} × R$ {product.unitPrice.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">R$ {product.subtotal.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">PIX</p>
                      <p className="font-bold text-foreground">R$ {report.paymentTotals.pix.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Cartão</p>
                      <p className="font-bold text-foreground">R$ {report.paymentTotals.card.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Dinheiro</p>
                      <p className="font-bold text-foreground">R$ {report.paymentTotals.cash.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleViewSession(session)}
                      className="flex-1 bg-gradient-to-r from-primary to-secondary"
                    >
                      Ver Detalhes
                    </Button>
                    <Button
                      onClick={() => handlePrint(session)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedSession && (() => {
            const report = calculateReportData(selectedSession);
            return (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Cardápio</p>
                    <p className="font-semibold text-foreground">
                      {report.menu ? getSaturdayLabel(report.menu.saturdayOrder) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-semibold text-foreground">
                      {report.menu ? new Date(report.menu.saturdayDate).toLocaleDateString("pt-BR") : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Responsável</p>
                    <p className="font-semibold text-foreground">
                      {report.menu?.responsibleName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Abertura</p>
                    <p className="font-semibold text-foreground">
                      {new Date(selectedSession.openedAt).toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* Individual Orders */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">Pedidos da Sessão</h3>
                    <span className="text-xs text-muted-foreground">{(selectedSession.orders || []).length} pedido(s)</span>
                  </div>
                  <div className="space-y-3">
                    {(selectedSession.orders || []).map((order) => {
                      const orderStatus = order.status || "completed";
                      const refundAudit = refundAuditsQuery.data?.find((audit) => audit.orderId === order.id);
                      const isCancelled = orderStatus === "cancelled";
                      const paymentLabel = order.paymentMethod === "pix" ? "PIX" : order.paymentMethod === "card" ? "Cartão" : "Dinheiro";
                      return (
                        <div
                          key={order.id}
                          className={`rounded-lg border p-4 ${isCancelled ? "border-gray-200 bg-gray-100/70 opacity-70" : "border-border bg-background"}`}
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className={isCancelled ? "text-gray-500 line-through" : ""}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold">Pedido #{order.id}</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium no-underline ${isCancelled ? "bg-gray-200 text-gray-600" : "bg-emerald-100 text-emerald-700"}`}>
                                  {isCancelled ? <RotateCcw className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                  {isCancelled ? "Cancelado" : orderStatus === "pending" ? "Pendente" : "Concluído"}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground no-underline">
                                {new Date(order.createdAt).toLocaleString("pt-BR")} · Total: R$ {Number(order.total || 0).toFixed(2)}
                              </p>
                              <div className="mt-2 space-y-1 text-xs text-muted-foreground no-underline">
                                {order.items.map((item, index) => (
                                  <div key={`${order.id}-${item.productId ?? item.id ?? index}`}>
                                    {item.quantity}× {item.productName} · R$ {Number(item.subtotal || 0).toFixed(2)}
                                  </div>
                                ))}
                              </div>
                              {isCancelled && (
                                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 no-underline">
                                  <p className="font-semibold">Auditoria do estorno</p>
                                  {refundAudit ? (
                                    <p className="mt-1">
                                      Usuário: {refundAudit.username} · Data: {new Date(refundAudit.createdAt).toLocaleString("pt-BR")} · Motivo: {refundAudit.reason}
                                    </p>
                                  ) : (
                                    <p className="mt-1">Auditoria ainda não disponível para este pedido.</p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 no-underline">
                              <select
                                aria-label={`Forma de pagamento do pedido ${order.id}`}
                                value={order.paymentMethod}
                                disabled={isCancelled || updatePaymentMethodMutation.isPending}
                                onChange={(event) => handleRequestPaymentChange(order, event.target.value as Order["paymentMethod"])}
                                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                              >
                                <option value="pix">PIX</option>
                                <option value="card">Cartão</option>
                                <option value="cash">Dinheiro</option>
                              </select>
                              <span className="text-xs text-muted-foreground">Atual: {paymentLabel}</span>
                              {!isCancelled && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="gap-1"
                                  onClick={async () => {
                                    setOrderToCancel(order);
                                    setCancelReason("");
                                    setRefundQuantities({});
                                  }}
                                  disabled={cancelOrderMutation.isPending}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Estornar Venda
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Products Table */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Produtos Vendidos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-semibold text-foreground">Produto</th>
                          <th className="text-center py-2 px-3 font-semibold text-foreground">Qtd</th>
                          <th className="text-right py-2 px-3 font-semibold text-foreground">Preço Unit.</th>
                          <th className="text-right py-2 px-3 font-semibold text-foreground">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(report.productSales).map(([key, product]) => (
                          <tr key={key} className="border-b border-border hover:bg-muted/50">
                            <td className="py-2 px-3 text-foreground">{product.name}</td>
                            <td className="py-2 px-3 text-center text-foreground">{product.quantity}</td>
                            <td className="py-2 px-3 text-right text-foreground">R$ {product.unitPrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-primary">R$ {product.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/50 font-semibold">
                          <td colSpan={3} className="py-2 px-3 text-right">TOTAL:</td>
                          <td className="py-2 px-3 text-right text-primary">R$ {report.grandTotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment Summary */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Resumo de Pagamentos</h3>
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">PIX</p>
                      <p className="text-lg font-bold text-foreground">R$ {report.paymentTotals.pix.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">Cartão</p>
                      <p className="text-lg font-bold text-foreground">R$ {report.paymentTotals.card.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">Dinheiro</p>
                      <p className="text-lg font-bold text-foreground">R$ {report.paymentTotals.cash.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirmation for payment correction */}
      <Dialog open={Boolean(pendingPaymentChange)} onOpenChange={(open) => !open && setPendingPaymentChange(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar correção de pagamento</DialogTitle>
          </DialogHeader>
          {pendingPaymentChange && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirma alterar o pagamento do pedido <strong>#{pendingPaymentChange.orderId}</strong> de <strong>{pendingPaymentChange.previousPaymentMethod === "pix" ? "PIX" : pendingPaymentChange.previousPaymentMethod === "card" ? "Cartão" : "Dinheiro"}</strong> para <strong>{pendingPaymentChange.paymentMethod === "pix" ? "PIX" : pendingPaymentChange.paymentMethod === "card" ? "Cartão" : "Dinheiro"}</strong>?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPendingPaymentChange(null)} disabled={updatePaymentMethodMutation.isPending}>Cancelar</Button>
                <Button onClick={handleConfirmPaymentChange} disabled={updatePaymentMethodMutation.isPending} className="gap-2">
                  {updatePaymentMethodMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar alteração
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation for item-level refund */}
      <Dialog open={Boolean(orderToCancel)} onOpenChange={(open) => { if (!open) { setOrderToCancel(null); setCancelReason(""); setRefundQuantities({}); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Estornar itens do pedido #{orderToCancel?.id}</DialogTitle>
          </DialogHeader>
          {orderToCancel && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Informe a quantidade a estornar para cada item. O estoque global e do cardápio serão devolvidos proporcionalmente.</p>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-3 max-h-60 overflow-y-auto">
                <div className="font-semibold pb-1 border-b border-border flex justify-between">
                  <span>Produto</span>
                  <span>Qtd / Restante</span>
                  <span>Estornar</span>
                </div>
                {(() => {
                  const itemsList = orderItemsQuery.data && orderItemsQuery.data.length > 0 ? orderItemsQuery.data : orderToCancel.items;
                  return itemsList.map((item: any, index: number) => {
                    const officialId = Number(item.id ?? item.orderItemId);
                    const itemKey = Number.isInteger(officialId) && officialId > 0 ? String(officialId) : String(index + 1);
                    const refunded = item.refundedQuantity || 0;
                    const maxRefundable = item.quantity - refunded;
                    const isFullyRefunded = maxRefundable <= 0;
                    const currentRefundQty = refundQuantities[itemKey] ?? 0;

                  return (
                    <div key={`${orderToCancel.id}-refund-item-${index}`} className={`flex items-center justify-between py-2 border-b border-border/60 last:border-0 ${isFullyRefunded ? "opacity-60 line-through" : ""}`}>
                      <div className="flex-1 pr-2">
                        <div className="font-medium text-foreground">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">Vendido: {item.quantity} | Já estornado: {refunded}</div>
                      </div>
                      <div className="text-xs font-semibold px-2 text-muted-foreground">
                        Restante: {maxRefundable}
                      </div>
                      <div className="w-24">
                        {isFullyRefunded ? (
                          <span className="text-xs font-bold text-destructive">Totalmente estornado</span>
                        ) : (
                          <Input
                            type="number"
                            min={0}
                            max={maxRefundable}
                            value={currentRefundQty}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(maxRefundable, parseInt(e.target.value || "0", 10)));
                              setRefundQuantities({ ...refundQuantities, [itemKey]: val });
                            }}
                            className="h-8 text-center"
                          />
                        )}
                      </div>
                    </div>
                  );
                  });
                })()}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const itemsList = orderItemsQuery.data && orderItemsQuery.data.length > 0 ? orderItemsQuery.data : orderToCancel.items;
                    const all: Record<string, number> = {};
                    itemsList.forEach((item: any, index: number) => {
                      const officialId = Number(item.id ?? item.orderItemId);
                      const itemKey = Number.isInteger(officialId) && officialId > 0 ? String(officialId) : String(index + 1);
                      const maxR = item.quantity - (item.refundedQuantity || 0);
                      if (maxR > 0) all[itemKey] = maxR;
                    });
                    setRefundQuantities(all);
                  }}
                >
                  Estornar pedido inteiro
                </Button>
              </div>

              <div className="space-y-2">
                <label htmlFor="cancel-reason" className="text-sm font-medium">Motivo (opcional)</label>
                <Input id="cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ex.: cliente devolveu o produto" maxLength={255} disabled={refundItemsMutation.isPending} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setOrderToCancel(null); setCancelReason(""); setRefundQuantities({}); }} disabled={refundItemsMutation.isPending}>Cancelar</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    const itemsList = orderItemsQuery.data && orderItemsQuery.data.length > 0 ? orderItemsQuery.data : orderToCancel.items;
                    const itemsPayload = itemsList.map((item: any, index: number) => {
                      const officialId = Number(item.id ?? item.orderItemId);
                      const validId = Number.isInteger(officialId) && officialId > 0 ? officialId : (index + 1);
                      const itemKey = String(validId);
                      const qty = refundQuantities[itemKey] ?? refundQuantities[String(index + 1)] ?? 0;
                      return { orderItemId: validId, quantity: Number(qty) };
                    }).filter((i) => i.quantity > 0 && Number.isInteger(i.orderItemId) && i.orderItemId > 0);

                    if (itemsPayload.length === 0) {
                      toast.error("Informe ao menos uma quantidade para estornar.");
                      return;
                    }

                    // Se o ID for um timestamp local (pedido legado não sincronizado), forçamos a sincronização prévia ou tratamos localmente
                    if (orderToCancel.id > 1000000000) {
                      restoreLocalMenuStock(orderToCancel);
                      updateOrderInLocalStorage(orderToCancel.id, { status: "cancelled" });
                      toast.success("Pedido legado estornado com sucesso no registro local e estoque devolvido.");
                      setOrderToCancel(null);
                      setCancelReason("");
                      setRefundQuantities({});
                      return;
                    }

                    refundItemsMutation.mutate({
                      orderId: orderToCancel.id,
                      items: itemsPayload,
                      reason: cancelReason || "Estorno parcial",
                    });
                  }}
                  disabled={refundItemsMutation.isPending}
                  className="gap-2"
                >
                  {refundItemsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar Estorno de Itens
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
