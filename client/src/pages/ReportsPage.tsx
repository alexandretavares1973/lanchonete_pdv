import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Printer } from "lucide-react";

interface MenuItem {
  id: string;
  productName: string;
  price: number;
  quantity: number | null;
  isUnlimited: boolean;
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
  price?: number;
  unitPrice?: number;
  subtotal: number;
}

interface Order {
  id: number;
  paymentMethod: "pix" | "card" | "cash";
  total: number;
  items: OrderItem[];
  createdAt: string;
}

interface CashierSession {
  id: number;
  weeklyMenuId: number;
  openedAt: string;
  closedAt: string | null;
  orders: Order[];
}

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const [menus, setMenus] = useState<WeeklyMenu[]>([]);
  const [sessions, setSessions] = useState<CashierSession[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<CashierSession | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const storedMenus = localStorage.getItem("weeklyMenus");
    if (storedMenus) {
      setMenus(JSON.parse(storedMenus));
    }

    const storedSessions = localStorage.getItem("cashierSessions");
    if (storedSessions) {
      setSessions(JSON.parse(storedSessions));
    }
  }, []);

  const getSaturdayLabel = (order: number) => {
    const labels = ["1º", "2º", "3º", "4º", "5º"];
    return `${labels[order - 1] || order}º Sábado`;
  };

  const getSessionsForMenu = (menuId: number) => {
    return sessions.filter(s => s.weeklyMenuId === menuId);
  };

  const calculateReportData = (session: CashierSession) => {
    const menu = menus.find(m => m.id === session.weeklyMenuId);
    const orders = session.orders || [];

    // Agrupar vendas por produto
    const productSales: Record<string, { name: string; quantity: number; unitPrice: number; subtotal: number }> = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.productName;
        const unitPrice = item.unitPrice || item.price || 0;
        
        if (!productSales[key]) {
          productSales[key] = {
            name: item.productName,
            quantity: 0,
            unitPrice: unitPrice,
            subtotal: 0,
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].subtotal += item.subtotal;
      });
    });

    // Totais por forma de pagamento
    const paymentTotals = {
      pix: 0,
      card: 0,
      cash: 0,
    };

    orders.forEach(order => {
      paymentTotals[order.paymentMethod] += order.total;
    });

    const grandTotal = orders.reduce((sum, order) => sum + order.total, 0);

    return {
      menu,
      productSales,
      paymentTotals,
      grandTotal,
      totalItems: orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
      ordersCount: orders.length,
    };
  };

  const handleViewSession = (session: CashierSession) => {
    setSelectedSession(session);
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
          <h2 className="font-semibold text-foreground mb-4">Filtrar por Cardápio</h2>
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
    </div>
  );
}
