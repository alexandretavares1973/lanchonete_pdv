import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingCart, Trash2, Lock } from "lucide-react";

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
  status: "open" | "closed";
  items: MenuItem[];
}

interface CartItem {
  id: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export default function POSPage() {
  const [, setLocation] = useLocation();
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "cash">("pix");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [lastOrderChange, setLastOrderChange] = useState<number>(0);
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);
  const [lastOrderTotal, setLastOrderTotal] = useState<number>(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<'pix' | 'card' | 'cash'>('pix');
  const [lastAmountReceived, setLastAmountReceived] = useState<number>(0);

  useEffect(() => {
    const storedMenus = localStorage.getItem("weeklyMenus");
    if (storedMenus) {
      const parsed = JSON.parse(storedMenus);
      setMenus(parsed);
      
      // Selecionar primeiro cardápio aberto
      const openMenu = parsed.find((m: any) => m.status === "open");
      if (openMenu) {
        setSelectedMenu(openMenu);
      }
    }
  }, []);

  const handleAddToCart = (product: MenuItem) => {
    // Validar se o cardápio está aberto
    if (!selectedMenu || selectedMenu.status !== "open") {
      toast.error("❌ Cardápio fechado! Não é possível fazer vendas.");
      return;
    }

    // Validar quantidade disponível
    if (!product.isUnlimited && product.quantity !== null && product.quantity <= 0) {
      toast.error("❌ Produto sem estoque!");
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      // Validar quantidade máxima
      if (!product.isUnlimited && product.quantity !== null) {
        // Calcular quantidade original do produto (quantidade atual + quantidade no carrinho)
        const originalQuantity = product.quantity + existingItem.quantity;
        if (existingItem.quantity >= originalQuantity) {
          toast.error("❌ Quantidade máxima atingida!");
          return;
        }
      }

      const updated = cart.map(item =>
        item.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price,
            }
          : item
      );
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          productName: product.productName,
          price: product.price,
          quantity: 1,
          subtotal: product.price,
        },
      ]);
    }

    // Atualizar estoque no cardápio
    if (!product.isUnlimited && product.quantity !== null) {
      const updatedMenus = menus.map(menu =>
        menu.id === selectedMenu.id
          ? {
              ...menu,
              items: menu.items.map((item: MenuItem) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity !== null ? item.quantity - 1 : 0 }
                  : item
              ),
            }
          : menu
      );
      setMenus(updatedMenus);
      localStorage.setItem("weeklyMenus", JSON.stringify(updatedMenus));
    }

    // Atualizar estoque no cardápio
    if (!product.isUnlimited && product.quantity !== null) {
      const updatedMenus = menus.map(menu =>
        menu.id === selectedMenu.id
          ? {
              ...menu,
              items: menu.items.map((item: MenuItem) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity !== null ? item.quantity - 1 : 0 }
                  : item
              ),
            }
          : menu
      );
      setMenus(updatedMenus);
      // Atualizar selectedMenu com o novo cardápio
      const updatedSelectedMenu = updatedMenus.find(m => m.id === selectedMenu.id);
      if (updatedSelectedMenu) {
        setSelectedMenu(updatedSelectedMenu);
      }
      localStorage.setItem("weeklyMenus", JSON.stringify(updatedMenus));
    }

    toast.success(`✅ ${product.productName} adicionado ao carrinho!`);
  };

  const handleRemoveFromCart = (productId: string) => {
    const removedItem = cart.find(item => item.id === productId);
    setCart(cart.filter(item => item.id !== productId));
    
    // Devolver estoque ao remover do carrinho
    if (removedItem && selectedMenu) {
      const product = selectedMenu.items.find((p: MenuItem) => p.id === productId);
      if (product && !product.isUnlimited) {
        const updatedMenus = menus.map(menu =>
          menu.id === selectedMenu.id
            ? {
                ...menu,
                items: menu.items.map((item: MenuItem) =>
                  item.id === productId
                    ? { ...item, quantity: item.quantity !== null ? item.quantity + removedItem.quantity : removedItem.quantity }
                    : item
                ),
              }
            : menu
        );
        setMenus(updatedMenus);
        // Atualizar selectedMenu com o novo cardápio
        const updatedSelectedMenu = updatedMenus.find(m => m.id === selectedMenu.id);
        if (updatedSelectedMenu) {
          setSelectedMenu(updatedSelectedMenu);
        }
        localStorage.setItem("weeklyMenus", JSON.stringify(updatedMenus));
      }
    }
    
    toast.success("✅ Item removido do carrinho!");
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    const currentItem = cart.find(item => item.id === productId);
    const product = selectedMenu?.items.find((p: MenuItem) => p.id === productId);
    if (product && !product.isUnlimited && product.quantity !== null && newQuantity > product.quantity) {
      toast.error("❌ Quantidade máxima atingida!");
      return;
    }

    // Calcular diferença de quantidade para ajustar estoque
    if (currentItem && product && !product.isUnlimited) {
      const quantityDifference = currentItem.quantity - newQuantity;
      const updatedMenus = menus.map(menu =>
        menu.id === selectedMenu.id
          ? {
              ...menu,
              items: menu.items.map((item: MenuItem) =>
                item.id === productId
                  ? { ...item, quantity: item.quantity !== null ? item.quantity + quantityDifference : 0 }
                  : item
              ),
            }
          : menu
      );
      setMenus(updatedMenus);
      // Atualizar selectedMenu com o novo cardápio
      const updatedSelectedMenu = updatedMenus.find(m => m.id === selectedMenu.id);
      if (updatedSelectedMenu) {
        setSelectedMenu(updatedSelectedMenu);
      }
      localStorage.setItem("weeklyMenus", JSON.stringify(updatedMenus));
    }

    setCart(
      cart.map(item =>
        item.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: newQuantity * item.price,
            }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleCompleteOrder = () => {
    if (cart.length === 0) {
      toast.error("❌ Carrinho vazio!");
      return;
    }

    if (!selectedMenu || selectedMenu.status !== "open") {
      toast.error("❌ Cardápio fechado! Não é possível fazer vendas.");
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmOrder = () => {
    const total = calculateTotal();
    
    // Validar pagamento em dinheiro
    if (paymentMethod === "cash" && amountReceived < total) {
      toast.error("❌ Valor recebido é menor que o total!");
      return;
    }

    // Calcular troco
    const change = paymentMethod === "cash" ? amountReceived - total : 0;
    setLastOrderChange(change);

    // Salvar pedido
    const sessions = JSON.parse(localStorage.getItem("cashierSessions") || "[]");
    
    const newOrder = {
      id: Date.now(),
      paymentMethod,
      total: total,
      amountReceived: paymentMethod === "cash" ? amountReceived : null,
      change: paymentMethod === "cash" ? change : null,
      items: cart,
      createdAt: new Date().toISOString(),
    };

    // Encontrar ou criar sessão para este cardápio
    let session = sessions.find((s: any) => s.weeklyMenuId === selectedMenu.id && !s.closedAt);
    
    if (!session) {
      session = {
        id: Date.now(),
        weeklyMenuId: selectedMenu.id,
        openedAt: new Date().toISOString(),
        closedAt: null,
        orders: [],
      };
      sessions.push(session);
    }

    session.orders.push(newOrder);
    localStorage.setItem("cashierSessions", JSON.stringify(sessions));

    // Salvar itens do pedido para impressão
    setLastOrderItems(cart);
    setLastOrderTotal(total);
    setLastPaymentMethod(paymentMethod);
    setLastAmountReceived(paymentMethod === "cash" ? amountReceived : 0);

    toast.success("✅ Pedido finalizado!");
    setShowConfirm(false);
    setShowPrint(true);
    setCart([]);
    setAmountReceived(0);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const total = lastOrderTotal;
    const paymentLabel = lastPaymentMethod === "pix" ? "PIX" : lastPaymentMethod === "card" ? "CARTÃO" : "DINHEIRO";
    const timestamp = new Date();
    const itemsToPrint = lastOrderItems.length > 0 ? lastOrderItems : cart;

    const itemsHtml = itemsToPrint.map(item => `
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin: 8px 0; padding: 5px 0; border-bottom: 1px dotted #999;">
        <div style="flex: 1;">
          <div style="font-weight: bold;">${item.productName}</div>
          <div style="font-size: 11px; color: #666;">Qtd: ${item.quantity} x R$ ${item.price.toFixed(2)}</div>
        </div>
        <div style="text-align: right; font-weight: bold; min-width: 70px;">R$ ${item.subtotal.toFixed(2)}</div>
      </div>
    `).join("");

    const changeSection = lastPaymentMethod === "cash" ? `
      <div class="summary">
        <div class="summary-row">
          <span><strong>Valor Recebido:</strong></span>
          <span>R$ ${lastAmountReceived.toFixed(2)}</span>
        </div>
        <div class="summary-row" style="color: #2ecc71; font-weight: bold;">
          <span>TROCO:</span>
          <span>R$ ${lastOrderChange.toFixed(2)}</span>
        </div>
      </div>
    ` : "";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cupom de Venda</title>
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
          .items { margin: 10px 0; }
          .item { 
            display: flex; 
            justify-content: space-between; 
            font-size: 12px; 
            margin: 8px 0; 
            padding: 5px 0; 
            border-bottom: 1px dotted #999; 
          }
          .item-name { 
            flex: 1; 
            font-weight: bold;
          }
          .item-qty { 
            font-size: 11px; 
            color: #666;
            margin-top: 2px;
          }
          .item-total { 
            text-align: right; 
            font-weight: bold; 
            min-width: 70px; 
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
          .payment-info { 
            text-align: center; 
            font-size: 11px; 
            margin: 10px 0; 
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
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
            <p>CUPOM DE VENDA</p>
            <p>━━━━━━━━━━━━━━━━━━━━━━━</p>
            <p><strong>Cardápio:</strong> ${selectedMenu ? getSaturdayLabel(selectedMenu.saturdayOrder) : "N/A"}</p>
            <p><strong>Data:</strong> ${timestamp.toLocaleDateString("pt-BR")}</p>
            <p><strong>Hora:</strong> ${timestamp.toLocaleTimeString("pt-BR")}</p>
          </div>

          <div class="section-title">PRODUTOS COMPRADOS</div>
          <div class="items">
            ${itemsHtml}
          </div>

          <div class="divider"></div>

          <div class="summary">
            <div class="summary-row">
              <span><strong>Total de Itens:</strong></span>
              <span>${itemsToPrint.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
          </div>

          <div class="total-row">
            <span>TOTAL:</span>
            <span>R$ ${total.toFixed(2)}</span>
          </div>

          <div class="payment-info">
            <strong>Forma de Pagamento:</strong><br>
            ${paymentLabel}
          </div>

          ${changeSection}

          <div class="footer">
            <p>━━━━━━━━━━━━━━━━━━━━━━━</p>
            <p>Obrigado pela compra!</p>
            <p style="margin-top: 10px;">Volte sempre!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    setShowPrint(false);
  };

  const getSaturdayLabel = (order: number) => {
    const labels = ["1º", "2º", "3º", "4º", "5º"];
    return `${labels[order - 1] || order}º Sábado`;
  };

  const openMenus = menus.filter((m: any) => m.status === "open");
  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ponto de Venda</h1>
            <p className="text-muted-foreground">Realize vendas do cardápio semanal</p>
          </div>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
          >
            Voltar
          </Button>
        </div>

        {/* Menu Selection */}
        {openMenus.length === 0 ? (
          <Card className="p-12 text-center mb-6">
            <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground mb-2">Nenhum Cardápio Aberto</p>
            <p className="text-muted-foreground mb-4">
              Abra um cardápio semanal para começar a vender.
            </p>
            <Button
              onClick={() => setLocation("/weekly-menu")}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              Ir para Cardápios
            </Button>
          </Card>
        ) : (
          <>
            <Card className="p-4 mb-6">
              <label className="text-sm font-medium text-foreground block mb-2">
                Selecione o Cardápio
              </label>
              <select
                value={selectedMenu?.id || ""}
                onChange={(e) => {
                  const menu = menus.find((m: any) => m.id === parseInt(e.target.value));
                  setSelectedMenu(menu);
                  setCart([]);
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="">Selecione um cardápio</option>
                {openMenus.map((menu: any) => (
                  <option key={menu.id} value={menu.id}>
                    {getSaturdayLabel(menu.saturdayOrder)} - {new Date(menu.saturdayDate).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </Card>

            {selectedMenu && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Products */}
                <div className="lg:col-span-2">
                  <Card className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">Produtos Disponíveis</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedMenu.items.map((product: MenuItem) => (
                        <div
                          key={product.id}
                          className="p-4 border border-border rounded-lg hover:border-primary transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground">{product.productName}</h3>
                            <span className="text-primary font-bold">R$ {product.price.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {product.isUnlimited ? "Ilimitado" : `${product.quantity} disponível(is)`}
                          </p>
                          <Button
                            onClick={() => handleAddToCart(product)}
                            className="w-full bg-gradient-to-r from-primary to-secondary text-white"
                            disabled={!product.isUnlimited && product.quantity !== null && product.quantity <= 0}
                          >
                            Adicionar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Cart */}
                <div>
                  <Card className="p-6 sticky top-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      <h2 className="text-xl font-bold text-foreground">Carrinho</h2>
                    </div>

                    {cart.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Carrinho vazio</p>
                    ) : (
                      <>
                        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                          {cart.map((item) => (
                            <div key={item.id} className="p-3 border border-border rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-foreground text-sm">{item.productName}</h3>
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                  className="px-2 py-1 border border-border rounded text-sm"
                                >
                                  -
                                </button>
                                <span className="flex-1 text-center text-sm font-semibold">{item.quantity}</span>
                                <button
                                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                  className="px-2 py-1 border border-border rounded text-sm"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">R$ {item.price.toFixed(2)}</span>
                                <span className="font-bold text-primary">R$ {item.subtotal.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-border pt-4 mb-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-foreground">Subtotal:</span>
                            <span className="font-bold">R$ {total.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-3 mb-4">
                          <label className="text-sm font-medium text-foreground block">
                            Forma de Pagamento
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as "pix" | "card" | "cash")}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                          >
                            <option value="pix">PIX</option>
                            <option value="card">CARTÃO</option>
                            <option value="cash">DINHEIRO</option>
                          </select>
                        </div>

                        {paymentMethod === "cash" && (
                          <div className="space-y-3 mb-4 p-3 bg-primary/10 rounded-lg">
                            <label className="text-sm font-medium text-foreground block">
                              Valor Recebido
                            </label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={amountReceived || ""}
                              onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                              className="text-foreground"
                              step="0.01"
                              min="0"
                            />
                            {amountReceived > 0 && (
                              <div className="p-2 bg-green-100 rounded text-green-800 text-sm font-semibold">
                                Troco: R$ {(amountReceived - total).toFixed(2)}
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          onClick={handleCompleteOrder}
                          className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold"
                        >
                          Finalizar Pedido
                        </Button>
                      </>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </>
        )}

        {/* Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Confirmar Pedido</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Total do Pedido:</p>
                <p className="text-3xl font-bold text-primary">R$ {total.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-secondary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Forma de Pagamento:</p>
                <p className="text-lg font-semibold text-foreground">
                  {paymentMethod === "pix" ? "PIX" : paymentMethod === "card" ? "CARTÃO" : "DINHEIRO"}
                </p>
              </div>
              {paymentMethod === "cash" && (
                <div className="p-4 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800 mb-2">Valor Recebido:</p>
                  <p className="text-lg font-semibold text-green-800">R$ {amountReceived.toFixed(2)}</p>
                  <p className="text-sm text-green-800 mt-2">Troco: R$ {(amountReceived - total).toFixed(2)}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmOrder}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Print Dialog */}
        <Dialog open={showPrint} onOpenChange={setShowPrint}>
          <DialogContent className="bg-background border border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Imprimir Cupom?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">Deseja imprimir o cupom do pedido?</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPrint(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Não
                </Button>
                <Button
                  onClick={handlePrint}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white"
                >
                  Imprimir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
