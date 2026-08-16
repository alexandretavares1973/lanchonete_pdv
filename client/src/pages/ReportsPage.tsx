import { useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, FileDown, Loader2, Printer, RotateCcw } from "lucide-react";
import { createTextPdf, downloadTextPdf } from "@/lib/simplePdf";
import { filterOrdersByReportDate, getReportDateShortcutRange, isReportDateRangeValid, matchesReportSearch, type ReportDateRange, type ReportDateShortcut } from "../../../shared/reportDateFilters";
import { getCustomerSearchSuggestions } from "../../../shared/reportSearchSuggestions";
import { resolveRefundProductName } from "../../../shared/refundItemDisplay";
import { getReportCustomerLabel } from "../../../shared/reportCustomerDisplay";

interface MenuItem {
  id: number | string;
  productId?: number;
  productName: string;
  price: number;
  quantity: number | null;
  isAvailable?: boolean;
}

interface WeeklyMenu {
  id: number;
  saturdayDate: Date | string;
  saturdayOrder: number;
  responsibleId: number | null;
  responsibleName?: string;
  items: MenuItem[];
}

interface OrderItem {
  id?: number;
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
  customerId?: number | null;
  customerName?: string | null;
  items: OrderItem[];
  createdAt: Date | string;
}

interface CashierSession {
  id: number;
  legacyId?: string | number;
  responsibleId?: number | null;
  responsibleName?: string | null;
  weeklyMenuId?: number | null;
  openedAt: Date | string;
  closedAt: Date | string | null;
  orders: Order[];
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt: Date | string;
}

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const { data: sharedMenus } = trpc.pdv.menu.list.useQuery();
  const { data: sharedSessions, isLoading: sessionsLoading } = trpc.pdv.cashier.getAllSessionsWithOrders.useQuery();
  const { data: sharedCustomers } = trpc.pdv.customers.list.useQuery();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportSearchTerm, setReportSearchTerm] = useState("");
  const [isCustomerSuggestionsOpen, setIsCustomerSuggestionsOpen] = useState(false);
  const [activeCustomerSuggestionIndex, setActiveCustomerSuggestionIndex] = useState(0);
  const allSessions = useMemo(() => (sharedSessions ?? []) as CashierSession[], [sharedSessions]);
  const customers = useMemo(
    () => ((sharedCustomers ?? []) as Customer[]).filter((customer) => customer.isActive !== false).sort((left, right) => left.name.localeCompare(right.name, "pt-BR")),
    [sharedCustomers],
  );
  const customerSuggestions = useMemo(
    () => getCustomerSearchSuggestions(customers, reportSearchTerm),
    [customers, reportSearchTerm],
  );
  const sessions = useMemo(
    () => allSessions.filter((session) => session.weeklyMenuId !== null && session.weeklyMenuId !== undefined),
    [allSessions],
  );
  const unlinkedSessionCount = allSessions.filter((session) => session.weeklyMenuId === null || session.weeklyMenuId === undefined).length;
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
        utils.pdv.cashier.getAllSessionsWithOrders.invalidate(),
        utils.pdv.orders.getItems.invalidate({ orderId: orderToCancel?.id ?? 0 }),
        utils.pdv.products.list.invalidate(),
        utils.pdv.menu.getItems.invalidate(),
      ]);
      toast.success("✅ Estorno parcial realizado com sucesso! Estoque devolvido.");
      setOrderToCancel(null);
      setCancelReason("");
      setRefundQuantities({});
    },
    onError: (err) => {
      toast.error(`❌ Erro ao estornar itens: ${err.message}`);
    },
  });
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const utils = trpc.useUtils();
  const updatePaymentMethodMutation = trpc.pdv.orders.updatePaymentMethod.useMutation();
  const refundAuditsQuery = trpc.pdv.orders.getRefundAudits.useQuery(
    { orderIds: selectedOrderIds },
    { enabled: showDetails && selectedOrderIds.length > 0 },
  );


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
      await Promise.all([
        utils.pdv.cashier.getAllSessionsWithOrders.invalidate(),
        utils.pdv.orders.getItems.invalidate({ orderId: pendingPaymentChange.orderId }),
      ]);
      toast.success("Forma de pagamento corrigida com sucesso.");
      setPendingPaymentChange(null);
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível corrigir a forma de pagamento.");
    }
  };

  useEffect(() => {
    setMenus((sharedMenus ?? []) as WeeklyMenu[]);
  }, [sharedMenus]);

  useEffect(() => {
    if (!selectedSession) return;
    const refreshed = sessions.find((session) => session.id === selectedSession.id);
    if (refreshed && refreshed !== selectedSession) setSelectedSession(refreshed);
  }, [sessions, selectedSession]);

  const getSaturdayLabel = (order: number) => {
    const labels = ["1º", "2º", "3º", "4º", "5º"];
    return `${labels[order - 1] || order}º Sábado`;
  };

  const getSessionsForMenu = (menuId: number) => {
    return sessions.filter(s => s.weeklyMenuId === menuId);
  };

  const reportDateRange: ReportDateRange = { startDate: reportStartDate, endDate: reportEndDate };
  const reportDateRangeIsValid = isReportDateRangeValid(reportDateRange);
  const hasReportDateFilter = Boolean(reportStartDate || reportEndDate);
  const hasReportSearch = Boolean(reportSearchTerm.trim());
  const getReportOrders = (session: CashierSession) => filterOrdersByReportDate(session.orders || [], reportDateRange);
  const reportDateLabel = reportStartDate || reportEndDate
    ? `${reportStartDate ? new Date(`${reportStartDate}T00:00:00`).toLocaleDateString("pt-BR") : "início"} a ${reportEndDate ? new Date(`${reportEndDate}T00:00:00`).toLocaleDateString("pt-BR") : "hoje"}`
    : "Todas as datas";
  const resetReportDateFilter = () => {
    setReportStartDate("");
    setReportEndDate("");
  };
  const applyDateShortcut = (shortcut: ReportDateShortcut) => {
    const range = getReportDateShortcutRange(shortcut);
    setReportStartDate(range.startDate || "");
    setReportEndDate(range.endDate || "");
  };
  const resetReportFilters = () => {
    resetReportDateFilter();
    setReportSearchTerm("");
    setIsCustomerSuggestionsOpen(false);
    setActiveCustomerSuggestionIndex(0);
  };
  const selectCustomerSuggestion = (customerName: string) => {
    setReportSearchTerm(customerName);
    setIsCustomerSuggestionsOpen(false);
    setActiveCustomerSuggestionIndex(0);
  };
  const handleCustomerSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCustomerSuggestionsOpen || customerSuggestions.length === 0) {
      if (event.key === "Escape") setIsCustomerSuggestionsOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCustomerSuggestionIndex((index) => Math.min(index + 1, customerSuggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCustomerSuggestionIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectCustomerSuggestion(customerSuggestions[activeCustomerSuggestionIndex].name);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsCustomerSuggestionsOpen(false);
    }
  };

  const calculateReportData = (session: CashierSession) => {
    const menu = menus.find(m => m.id === session.weeklyMenuId);
    if (!menu) return null;
    const orders = getReportOrders(session).filter((order) => order.status !== "cancelled");

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
    setSelectedOrderIds(getReportOrders(session).map((order) => Number(order.id)).filter((id) => Number.isInteger(id) && id > 0));
    setShowDetails(true);
  };

  const handleExportPDF = (session: CashierSession) => {
    const report = calculateReportData(session);
    if (!report) return;
    const menuLabel = report.menu ? getSaturdayLabel(report.menu.saturdayOrder) : "N/A";
    const menuDate = report.menu ? new Date(report.menu.saturdayDate).toLocaleDateString("pt-BR") : "N/A";
    const lines = [
      `Cardápio: ${menuLabel} (${menuDate})`,
      `Responsável: ${report.menu?.responsibleName || "N/A"}`,
      `Abertura: ${new Date(session.openedAt).toLocaleString("pt-BR")}`,
      `Período filtrado: ${reportDateLabel}`,
      `Status: ${session.closedAt ? "Fechado" : "Aberto"}`,
      "",
      "PRODUTOS VENDIDOS:",
      ...Object.entries(report.productSales).map(([_, prod]) =>
        `- ${prod.name} | Qtd: ${prod.quantity} | Preço Unit.: R$ ${prod.unitPrice.toFixed(2)} | Subtotal: R$ ${prod.subtotal.toFixed(2)}`
      ),
      "",
      `Total de Itens: ${report.totalItems}`,
      `Total de Pedidos: ${report.ordersCount}`,
      "",
      "RESUMO DE PAGAMENTOS:",
      `PIX: R$ ${report.paymentTotals.pix.toFixed(2)}`,
      `Cartão: R$ ${report.paymentTotals.card.toFixed(2)}`,
      `Dinheiro: R$ ${report.paymentTotals.cash.toFixed(2)}`,
      "",
      `TOTAL GERAL: R$ ${report.grandTotal.toFixed(2)}`,
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ];
    downloadTextPdf(`relatorio-vendas-sabado-${session.weeklyMenuId}.pdf`, `Relatório de Vendas - ${menuLabel}`, lines);
    toast.success("✅ PDF do relatório de vendas exportado com sucesso!");
  };

  const handleShareWhatsApp = async (session: CashierSession) => {
    const report = calculateReportData(session);
    if (!report) return;
    const menuLabel = report.menu ? getSaturdayLabel(report.menu.saturdayOrder) : "N/A";
    const menuDate = report.menu ? new Date(report.menu.saturdayDate).toLocaleDateString("pt-BR") : "N/A";

    const textSummary = [
      `📊 *Relatório de Vendas - ${menuLabel} (${menuDate})*`,
      `👤 Responsável: ${report.menu?.responsibleName || "N/A"}`,
      `📅 Período: ${reportDateLabel}`,
      `📦 Total de Itens: ${report.totalItems} | Pedidos: ${report.ordersCount}`,
      `💰 *Total Geral: R$ ${report.grandTotal.toFixed(2)}*`,
      `📱 PIX: R$ ${report.paymentTotals.pix.toFixed(2)} | Cartão: R$ ${report.paymentTotals.card.toFixed(2)} | Dinheiro: R$ ${report.paymentTotals.cash.toFixed(2)}`,
      "",
      "🛍️ *Produtos:*",
      ...Object.entries(report.productSales).map(([_, prod]) =>
        `• ${prod.name}: ${prod.quantity}x (R$ ${prod.subtotal.toFixed(2)})`
      ),
    ].join("\n");

    const filename = `relatorio-vendas-sabado-${session.weeklyMenuId}.pdf`;
    const pdfContent = createTextPdf(`Relatório de Vendas - ${menuLabel}`, [
      `Cardápio: ${menuLabel} (${menuDate})`,
      `Responsável: ${report.menu?.responsibleName || "N/A"}`,
      `Período filtrado: ${reportDateLabel}`,
      `Total Geral: R$ ${report.grandTotal.toFixed(2)}`,
      "",
      ...Object.entries(report.productSales).map(([_, prod]) => `${prod.name} | ${prod.quantity}x | R$ ${prod.subtotal.toFixed(2)}`),
    ]);
    const file = new File([pdfContent], filename, { type: "application/pdf" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Relatório de Vendas - ${menuLabel}`,
          text: textSummary,
          files: [file],
        });
        toast.success("✅ Relatório compartilhado com sucesso!");
        return;
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Share API error:", err);
        }
      }
    }

    // Fallback: baixar o PDF e abrir o WhatsApp Web com o resumo em texto
    downloadTextPdf(filename, `Relatório de Vendas - ${menuLabel}`, textSummary.split("\n"));
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textSummary)}`;
    window.open(whatsappUrl, "_blank");
    toast.success("✅ PDF baixado e WhatsApp aberto com o resumo do relatório!");
  };

  const handlePrint = (session: CashierSession) => {
    const report = calculateReportData(session);
    if (!report) return;
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
            <p><strong>Período filtrado:</strong> ${reportDateLabel}</p>
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

  const activeSessions = (selectedMenuId
    ? getSessionsForMenu(selectedMenuId)
    : sessions).filter(session => {
      const menu = menus.find(m => m.id === session.weeklyMenuId);
      return Boolean(menu) && (!hasReportDateFilter || getReportOrders(session).length > 0) && matchesReportSearch(session, reportSearchTerm);
    });

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
          <div className="mb-4">
            <h2 className="font-semibold text-foreground">Filtrar por Cardápio</h2>
            <p className="text-xs text-muted-foreground">Os dados exibidos vêm das sessões, pedidos e cardápios compartilhados no banco.</p>
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

        <Card className="mb-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Filtrar por período</h2>
                <p className="text-xs text-muted-foreground">O período usa a data de criação dos pedidos e afeta totais, detalhes e exportações.</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={resetReportFilters} disabled={!hasReportDateFilter && !hasReportSearch} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => applyDateShortcut("today")}>Hoje</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyDateShortcut("week")}>Esta semana</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyDateShortcut("month")}>Este mês</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-end">
            <div className="relative">
              <label htmlFor="reports-search" className="text-sm font-medium text-foreground">Buscar cliente ou responsável</label>
              <Input
                id="reports-search"
                type="search"
                value={reportSearchTerm}
                onChange={(event) => { setReportSearchTerm(event.target.value); setActiveCustomerSuggestionIndex(0); setIsCustomerSuggestionsOpen(true); }}
                onFocus={() => setIsCustomerSuggestionsOpen(true)}
                onBlur={() => window.setTimeout(() => setIsCustomerSuggestionsOpen(false), 120)}
                onKeyDown={handleCustomerSearchKeyDown}
                placeholder="Nome do cliente ou responsável"
                className="mt-1"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isCustomerSuggestionsOpen && customerSuggestions.length > 0}
                aria-controls="reports-customer-suggestions"
              />
              {isCustomerSuggestionsOpen && customerSuggestions.length > 0 && (
                <div id="reports-customer-suggestions" role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                  {customerSuggestions.map((customer, index) => (
                    <button
                      key={customer.id}
                      type="button"
                      role="option"
                      aria-selected={index === activeCustomerSuggestionIndex}
                      className={`block w-full rounded px-3 py-2 text-left text-sm ${index === activeCustomerSuggestionIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectCustomerSuggestion(customer.name)}
                    >
                      {customer.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label htmlFor="reports-start-date" className="text-sm font-medium text-foreground">
              Data inicial
              <Input id="reports-start-date" type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} className="mt-1" />
            </label>
            <label htmlFor="reports-end-date" className="text-sm font-medium text-foreground">
              Data final
              <Input id="reports-end-date" type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} className="mt-1" />
            </label>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground"><strong className="text-foreground">{reportDateLabel}</strong></div>
          </div>
          {!reportDateRangeIsValid && <p className="mt-2 text-sm text-destructive">A data inicial deve ser anterior ou igual à data final.</p>}
        </Card>

        {unlinkedSessionCount > 0 && (
          <Card className="mb-6 border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">{unlinkedSessionCount} sessão(ões) histórica(s) sem cardápio identificado</p>
                <p className="mt-1 text-sm">Essas vendas não entram no relatório para evitar associá-las ao cardápio errado. Novas sessões já são gravadas com o cardápio selecionado.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Sessions List */}
        <div className="space-y-4">
          {activeSessions.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Nenhuma venda registrada</p>
            </Card>
          ) : (
            activeSessions.map(session => {
              const report = calculateReportData(session);
              if (!report) return null;
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
                      onClick={() => handleExportPDF(session)}
                      variant="outline"
                      className="gap-2"
                    >
                      <FileDown className="w-4 h-4" />
                      Exportar PDF
                    </Button>
                    <Button
                      onClick={() => handleShareWhatsApp(session)}
                      variant="outline"
                      className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      Compartilhar WhatsApp
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
            const displayedOrders = getReportOrders(selectedSession);
            const report = calculateReportData(selectedSession);
            if (!report) return <p className="text-muted-foreground">Cardápio associado foi excluído.</p>;
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
                    <span className="text-xs text-muted-foreground">{displayedOrders.length} pedido(s) no período</span>
                  </div>
                  <div className="space-y-3">
                    {displayedOrders.map((order) => {
                      const orderStatus = order.status || "completed";
                      const refundAudit = refundAuditsQuery.data?.find((audit) => audit.orderId === order.id);
                      const isCancelled = orderStatus === "cancelled";
                      const paymentLabel = order.paymentMethod === "pix" ? "PIX" : order.paymentMethod === "card" ? "Cartão" : "Dinheiro";
                      const customerLabel = getReportCustomerLabel(order.customerName);
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
                              <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                                👤 Cliente: {order.customerName ? order.customerName : "GERAL"} (ID: {order.customerId || "N/A"})
                              </div>
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
                                  disabled={refundItemsMutation.isPending}
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
                    const productName = resolveRefundProductName(item, orderToCancel.items);

                  return (
                    <div key={`${orderToCancel.id}-refund-item-${index}`} className={`flex items-center justify-between py-2 border-b border-border/60 last:border-0 ${isFullyRefunded ? "opacity-60 line-through" : ""}`}>
                      <div className="flex-1 pr-2">
                        <div className="font-medium text-foreground">{productName}</div>
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
