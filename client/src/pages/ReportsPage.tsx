import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OrderItemDetail {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderDetail {
  id: number;
  totalAmount: number;
  paymentMethod: "pix" | "card" | "cash";
  items: OrderItemDetail[];
  createdAt: string;
}

export default function ReportsPage() {
  const [, setLocation] = useLocation();
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Queries
  const { data: ordersData, isLoading } = trpc.pdv.orders.getBySession.useQuery(
    { cashierSessionId: 1 }, // TODO: usar sessão real
    { enabled: true }
  );

  // Calcular totais
  const calculateTotals = () => {
    if (!ordersData) return { total: 0, pix: 0, card: 0, cash: 0, items: 0 };

    const totals = {
      total: 0,
      pix: 0,
      card: 0,
      cash: 0,
      items: 0,
    };

    ordersData.forEach((order: any) => {
      const amount = typeof order.totalAmount === "string" 
        ? parseFloat(order.totalAmount) 
        : order.totalAmount;

      totals.total += amount;

      if (order.paymentMethod === "pix") {
        totals.pix += amount;
      } else if (order.paymentMethod === "card") {
        totals.card += amount;
      } else if (order.paymentMethod === "cash") {
        totals.cash += amount;
      }

      // Contar itens
      if (order.items && Array.isArray(order.items)) {
        totals.items += order.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      }
    });

    return totals;
  };

  const totals = calculateTotals();

  // Agrupar produtos vendidos
  const getProductsSummary = () => {
    if (!ordersData) return [];

    const productMap = new Map<number, { name: string; quantity: number; unitPrice: number; subtotal: number }>();

    ordersData.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const key = item.productId;
          const unitPrice = typeof item.unitPrice === "string" 
            ? parseFloat(item.unitPrice) 
            : item.unitPrice;

          if (productMap.has(key)) {
            const existing = productMap.get(key)!;
            existing.quantity += item.quantity;
            existing.subtotal += item.quantity * unitPrice;
          } else {
            productMap.set(key, {
              name: `Produto ${key}`, // TODO: buscar nome real do produto
              quantity: item.quantity,
              unitPrice,
              subtotal: item.quantity * unitPrice,
            });
          }
        });
      }
    });

    return Array.from(productMap.values());
  };

  const productsSummary = getProductsSummary();

  const handleViewDetails = (order: any) => {
    setSelectedOrder({
      id: order.id,
      totalAmount: typeof order.totalAmount === "string" 
        ? parseFloat(order.totalAmount) 
        : order.totalAmount,
      paymentMethod: order.paymentMethod,
      items: order.items || [],
      createdAt: order.createdAt,
    });
    setShowDetails(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground/60">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios de Vendas</h1>
            <p className="text-muted-foreground">Analise suas vendas e receitas</p>
          </div>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
          >
            Voltar
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Total de Vendas</p>
            <p className="text-3xl font-bold text-primary">R$ {totals.total.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Recebido via PIX</p>
            <p className="text-3xl font-bold text-blue-500">R$ {totals.pix.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Recebido via Cartão</p>
            <p className="text-3xl font-bold text-purple-500">R$ {totals.card.toFixed(2)}</p>
          </Card>
          <Card className="p-6">
            <p className="text-sm text-muted-foreground mb-2">Recebido em Dinheiro</p>
            <p className="text-3xl font-bold text-green-500">R$ {totals.cash.toFixed(2)}</p>
          </Card>
        </div>

        {/* Products Summary */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">Produtos Vendidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Produto</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Quantidade</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Preço Unitário</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {productsSummary.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-center text-muted-foreground">
                      Nenhum produto vendido
                    </td>
                  </tr>
                ) : (
                  productsSummary.map((product, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 text-foreground">{product.name}</td>
                      <td className="py-3 px-4 text-foreground font-semibold">{product.quantity}</td>
                      <td className="py-3 px-4 text-foreground">R$ {product.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-foreground font-semibold">R$ {product.subtotal.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Orders History */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Histórico de Pedidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Data</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Forma de Pagamento</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Itens</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {!ordersData || ordersData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-center text-muted-foreground">
                      Nenhum pedido registrado
                    </td>
                  </tr>
                ) : (
                  ordersData.map((order: any) => {
                    const itemCount = order.items 
                      ? order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
                      : 0;
                    const totalAmount = typeof order.totalAmount === "string"
                      ? parseFloat(order.totalAmount)
                      : order.totalAmount;

                    return (
                      <tr key={order.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 text-foreground font-semibold">#{order.id}</td>
                        <td className="py-3 px-4 text-foreground">
                          {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="py-3 px-4">
                          {order.paymentMethod === "pix" && <span className="text-blue-500">📱 PIX</span>}
                          {order.paymentMethod === "card" && <span className="text-purple-500">💳 Cartão</span>}
                          {order.paymentMethod === "cash" && <span className="text-green-500">💵 Dinheiro</span>}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">R$ {totalAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-foreground">{itemCount}</td>
                        <td className="py-3 px-4">
                          <Button
                            onClick={() => handleViewDetails(order)}
                            variant="outline"
                            size="sm"
                          >
                            Detalhes
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Export Options */}
        <div className="mt-6 flex gap-2">
          <Button className="bg-gradient-to-r from-primary to-secondary">
            Exportar PDF
          </Button>
          <Button variant="outline">
            Exportar Excel
          </Button>
          <Button variant="outline">
            Imprimir
          </Button>
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-semibold text-foreground">
                    {new Date(selectedOrder.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                  <p className="font-semibold text-foreground">
                    {selectedOrder.paymentMethod === "pix" && "PIX"}
                    {selectedOrder.paymentMethod === "card" && "Cartão"}
                    {selectedOrder.paymentMethod === "cash" && "Dinheiro"}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-foreground mb-3">Itens do Pedido</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: any, idx: number) => {
                    const unitPrice = typeof item.unitPrice === "string"
                      ? parseFloat(item.unitPrice)
                      : item.unitPrice;
                    const subtotal = typeof item.subtotal === "string"
                      ? parseFloat(item.subtotal)
                      : item.subtotal;

                    return (
                      <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <div>
                          <p className="text-sm text-foreground">Produto {item.productId}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity}x R$ {unitPrice.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-semibold text-foreground">R$ {subtotal.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold text-foreground">Total</p>
                  <p className="text-2xl font-bold text-primary">R$ {selectedOrder.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
