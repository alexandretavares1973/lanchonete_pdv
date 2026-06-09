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
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
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
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            unitPrice: item.unitPrice,
            subtotal: 0,
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].subtotal += item.subtotal;
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Vendas</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; }
          .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .payment-section { margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Relatório de Vendas</h1>
        <div class="header">
          <p><strong>Cardápio:</strong> ${report.menu ? getSaturdayLabel(report.menu.saturdayOrder) : "N/A"}</p>
          <p><strong>Data:</strong> ${report.menu ? new Date(report.menu.saturdayDate).toLocaleDateString("pt-BR") : "N/A"}</p>
          <p><strong>Responsável:</strong> ${report.menu?.responsibleName || "N/A"}</p>
          <p><strong>Data do Relatório:</strong> ${new Date(session.openedAt).toLocaleDateString("pt-BR")} às ${new Date(session.openedAt).toLocaleTimeString("pt-BR")}</p>
        </div>

        <h2>Produtos Vendidos</h2>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Preço Unitário</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(report.productSales).map(([_, product]) => `
              <tr>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>R$ ${product.unitPrice.toFixed(2)}</td>
                <td>R$ ${product.subtotal.toFixed(2)}</td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td colspan="3">TOTAL DE ITENS</td>
              <td>${report.totalItems}</td>
            </tr>
          </tbody>
        </table>

        <h2>Resumo de Pagamentos</h2>
        <div class="payment-section">
          <table>
            <tr>
              <td><strong>PIX:</strong></td>
              <td>R$ ${report.paymentTotals.pix.toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>Cartão:</strong></td>
              <td>R$ ${report.paymentTotals.card.toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>Dinheiro:</strong></td>
              <td>R$ ${report.paymentTotals.cash.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>TOTAL GERAL:</strong></td>
              <td><strong>R$ ${report.grandTotal.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
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
                        {Object.entries(report.productSales).map(([_, product]) => (
                          <tr key={_} className="border-b border-border hover:bg-muted/50">
                            <td className="py-2 px-3 text-foreground">{product.name}</td>
                            <td className="py-2 px-3 text-center text-foreground">{product.quantity}</td>
                            <td className="py-2 px-3 text-right text-foreground">R$ {product.unitPrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-primary">R$ {product.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="bg-primary/10 border-t-2 border-primary">
                          <td colSpan={3} className="py-2 px-3 font-bold text-foreground">TOTAL</td>
                          <td className="py-2 px-3 text-right font-bold text-primary text-lg">R$ {report.grandTotal.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment Summary */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Resumo de Pagamentos</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-foreground">PIX</span>
                      <span className="font-bold text-blue-700">R$ {report.paymentTotals.pix.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <span className="text-foreground">Cartão</span>
                      <span className="font-bold text-purple-700">R$ {report.paymentTotals.card.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-foreground">Dinheiro</span>
                      <span className="font-bold text-green-700">R$ {report.paymentTotals.cash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-primary/10 rounded-lg border-2 border-primary mt-2">
                      <span className="font-bold text-foreground">TOTAL GERAL</span>
                      <span className="font-bold text-primary text-lg">R$ {report.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button
                    onClick={() => handlePrint(selectedSession)}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Relatório
                  </Button>
                  <Button
                    onClick={() => setShowDetails(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
